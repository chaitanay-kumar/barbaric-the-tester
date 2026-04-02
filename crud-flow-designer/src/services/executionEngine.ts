import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Node, Edge } from 'reactflow';
import {
  ExecutionResult,
  ExecutionContext,
  HttpRequestNodeData,
  VariableExtractorNodeData,
  AssertionNodeData,
  ConditionalNodeData,
  LoopNodeData,
  AssertionResult,
} from '../types/flow';
import { EXECUTION_STATUS, EXECUTION_CONFIG, NODE_TYPES } from '../constants';
import { addToHistory, createHistoryEntry } from './requestHistory';

/**
 * Execution Engine Service
 * Handles sequential execution of flow nodes with cookie/session support
 */
export class ExecutionEngine {
  private context: ExecutionContext;
  private baseUrl: string = '';
  private authToken: string = '';
  private authConfig: any = null;
  private globalHeaders: Record<string, string> = {};
  private globalTimeout: number = EXECUTION_CONFIG.DEFAULT_TIMEOUT;
  private globalRetries: number = EXECUTION_CONFIG.MAX_RETRIES;
  private abortController: AbortController | null = null;
  private cookies: Map<string, string> = new Map();

  constructor(flowId: string, initialVariables?: Record<string, any>) {
    this.context = {
      flowId,
      variables: { ...initialVariables },
      results: [],
    };
  }

  /**
   * Execute a complete flow
   */
  async executeFlow(
    nodes: Node[],
    edges: Edge[],
    onNodeUpdate: (nodeId: string, status: string) => void,
    onResult: (result: ExecutionResult) => void,
    options?: { stopOnError?: boolean }
  ): Promise<void> {
    this.abortController = new AbortController();
    const stopOnError = options?.stopOnError ?? false;

    try {
      // Find start node
      const startNode = nodes.find((n) => n.type === NODE_TYPES.START);
      if (!startNode) {
        throw new Error('No start node found');
      }

      // Set base URL from start node (supports {{envVars}})
      this.baseUrl = this.substituteVariables(startNode.data.baseUrl || '');

      // Global auth config
      if (startNode.data.auth && startNode.data.auth.type !== 'none') {
        this.authConfig = startNode.data.auth;
        if (startNode.data.auth.type === 'bearer') {
          this.authToken = this.substituteVariables(startNode.data.auth.token || '');
        }
      }

      // Global headers, timeout, retries from Start node
      this.globalHeaders = { ...(startNode.data.headers || {}) };
      this.globalTimeout = startNode.data.globalTimeout || EXECUTION_CONFIG.DEFAULT_TIMEOUT;
      this.globalRetries = startNode.data.globalRetries ?? EXECUTION_CONFIG.MAX_RETRIES;

      // Build execution order (dynamic — respects conditional branching)
      const executionOrder = this.buildExecutionOrder(nodes, edges, startNode.id);

      // Execute nodes sequentially
      for (const nodeId of executionOrder) {
        if (this.abortController.signal.aborted) break;

        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        // Start node is config-only — skip execution
        if (node.type === NODE_TYPES.START) {
          onNodeUpdate(nodeId, EXECUTION_STATUS.SUCCESS);
          continue;
        }

        onNodeUpdate(nodeId, EXECUTION_STATUS.EXECUTING);

        const result = await this.executeNode(node);
        this.context.results.push(result);
        onResult(result);

        const finalStatus =
          result.status === EXECUTION_STATUS.ERROR
            ? EXECUTION_STATUS.ERROR
            : EXECUTION_STATUS.SUCCESS;
        onNodeUpdate(nodeId, finalStatus);

        // Only stop on error if explicitly configured
        if (stopOnError && result.status === EXECUTION_STATUS.ERROR) {
          break;
        }
      }
    } catch (error) {
      console.error('Flow execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(node: Node): Promise<ExecutionResult> {
    const startTime = new Date();
    const result: ExecutionResult = {
      nodeId: node.id,
      status: EXECUTION_STATUS.IDLE,
      startTime,
    };

    try {
      switch (node.type) {
        case NODE_TYPES.HTTP_REQUEST:
          await this.executeHttpRequest(node, result);
          break;
        case NODE_TYPES.VARIABLE_EXTRACTOR:
          await this.executeVariableExtractor(node, result);
          break;
        case NODE_TYPES.ASSERTION:
          await this.executeAssertion(node, result);
          break;
        case NODE_TYPES.DELAY:
          await this.executeDelay(node, result);
          break;
        case NODE_TYPES.CONDITIONAL:
          await this.executeConditional(node, result);
          break;
        case NODE_TYPES.LOOP:
          await this.executeLoop(node, result);
          break;
        case NODE_TYPES.SCRIPT:
          await this.executeScript(node, result);
          break;
        case NODE_TYPES.PARALLEL:
          await this.executeParallel(node, result);
          break;
        default:
          result.status = EXECUTION_STATUS.SKIPPED;
      }

      result.endTime = new Date();
      result.durationMs = result.endTime.getTime() - startTime.getTime();

      if (result.status === EXECUTION_STATUS.IDLE) {
        result.status = EXECUTION_STATUS.SUCCESS;
      }
    } catch (error: any) {
      result.status = EXECUTION_STATUS.ERROR;
      result.error = error.message || 'Unknown error';
      result.endTime = new Date();
      result.durationMs = result.endTime.getTime() - startTime.getTime();
    }

    return result;
  }

  /**
   * Execute HTTP request node
   */
  private async executeHttpRequest(node: Node, result: ExecutionResult): Promise<void> {
    const data = node.data as HttpRequestNodeData;
    let url = this.baseUrl + this.substituteVariables(data.path);

    // Append query params
    if (data.queryParams && data.queryParams.length > 0) {
      const enabledParams = data.queryParams.filter((p: any) => p.enabled !== false && p.key);
      if (enabledParams.length > 0) {
        const qs = enabledParams
          .map((p: any) => `${encodeURIComponent(p.key)}=${encodeURIComponent(this.substituteVariables(p.value || ''))}`)
          .join('&');
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    // Merge global headers first, then node-level headers override
    const headers: Record<string, string> = { ...this.globalHeaders, ...(data.headers || {}) };

    const config: AxiosRequestConfig = {
      method: data.method,
      url,
      headers,
      timeout: data.timeout || this.globalTimeout,
      signal: this.abortController?.signal,
      validateStatus: () => true,
    };

    // Add auth header — per-request override > global
    const authCfg = data.authOverride || this.authConfig;
    if (authCfg && authCfg.type !== 'none') {
      switch (authCfg.type) {
        case 'bearer':
          if (authCfg.token) {
            headers['Authorization'] = `Bearer ${this.substituteVariables(authCfg.token)}`;
          }
          break;
        case 'basic':
          if (authCfg.username) {
            const user = this.substituteVariables(authCfg.username || '');
            const pass = this.substituteVariables(authCfg.password || '');
            headers['Authorization'] = `Basic ${btoa(`${user}:${pass}`)}`;
          }
          break;
        case 'api-key':
          if (authCfg.apiKey) {
            const header = authCfg.apiKeyHeader || 'X-API-Key';
            headers[header] = this.substituteVariables(authCfg.apiKey);
          }
          break;
      }
    }

    // Add body for non-GET requests based on bodyType
    if (data.method !== 'GET' && data.method !== 'HEAD') {
      const bodyType = data.bodyType || 'json';

      if (bodyType === 'json' && data.body) {
        let bodyStr = typeof data.body === 'string' ? data.body : JSON.stringify(data.body);
        bodyStr = this.substituteVariables(bodyStr);
        try {
          config.data = JSON.parse(bodyStr);
        } catch {
          config.data = bodyStr;
        }
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';

      } else if (bodyType === 'form-urlencoded' && data.formData) {
        const params = new URLSearchParams();
        for (const entry of data.formData) {
          if (entry.enabled !== false && entry.key) {
            params.append(entry.key, this.substituteVariables(entry.value || ''));
          }
        }
        config.data = params.toString();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';

      } else if (bodyType === 'form-data' && data.formData) {
        const formData = new FormData();
        for (const entry of data.formData) {
          if (entry.enabled !== false && entry.key) {
            formData.append(entry.key, this.substituteVariables(entry.value || ''));
          }
        }
        config.data = formData;
        delete headers['Content-Type'];

      } else if (bodyType === 'raw' && data.body) {
        config.data = this.substituteVariables(
          typeof data.body === 'string' ? data.body : JSON.stringify(data.body)
        );
        if (!headers['Content-Type']) headers['Content-Type'] = 'text/plain';
      }
    }

    // Inject stored cookies
    if (this.cookies.size > 0) {
      const cookieStr = Array.from(this.cookies.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      headers['Cookie'] = cookieStr;
    }

    result.request = {
      method: data.method,
      url,
      headers,
      body: config.data,
    };

    // Execute with retry support
    const maxRetries = data.maxRetries ?? this.globalRetries;
    let lastError: Error | null = null;
    let response: AxiosResponse | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        response = await axios(config);
        break;
      } catch (err: any) {
        lastError = err;
        if (this.abortController?.signal.aborted) throw err;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, EXECUTION_CONFIG.RETRY_DELAY));
        }
      }
    }

    if (!response) {
      throw lastError || new Error('Request failed after retries');
    }

    result.response = {
      statusCode: response.status,
      headers: response.headers as Record<string, string>,
      body: response.data,
    };

    // Auto-store status code and response time for downstream conditional/assertion use
    this.context.variables['_lastStatusCode'] = response.status;
    result.durationMs = Date.now() - (result.startTime?.getTime() || Date.now());
    this.context.variables['_lastResponseTime'] = result.durationMs;

    // Capture cookies from Set-Cookie headers
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
      const cookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
      for (const cookie of cookieArray) {
        const nameValue = cookie.split(';')[0];
        const eqIdx = nameValue.indexOf('=');
        if (eqIdx > 0) {
          this.cookies.set(nameValue.slice(0, eqIdx).trim(), nameValue.slice(eqIdx + 1).trim());
        }
      }
    }

    // Save to request history
    const histEntry = createHistoryEntry(result);
    if (histEntry) addToHistory(histEntry);

    result.status = EXECUTION_STATUS.SUCCESS;
  }

  /**
   * Execute variable extractor node — honors source (body/headers/status), defaultValue, transform
   */
  private async executeVariableExtractor(node: Node, result: ExecutionResult): Promise<void> {
    const data = node.data as VariableExtractorNodeData;
    const prevResult = [...this.context.results].reverse().find((r) => r.response);

    if (!prevResult || !prevResult.response) {
      throw new Error('No previous HTTP response to extract from');
    }

    let value: any;
    const source = data.source || 'body';

    if (source === 'status') {
      value = prevResult.response.statusCode;
    } else if (source === 'headers') {
      // JSONPath on headers object
      value = this.evaluateJsonPath(prevResult.response.headers, data.jsonPath);
    } else {
      // body (default)
      value = this.evaluateJsonPath(prevResult.response.body, data.jsonPath);
    }

    // Apply default value if extraction returned undefined
    if (value === undefined && data.defaultValue) {
      value = data.defaultValue;
    }

    // Apply transform
    const transform = data.transform || 'none';
    if (value !== undefined && transform !== 'none') {
      switch (transform) {
        case 'toString': value = String(value); break;
        case 'toNumber': value = Number(value); break;
        case 'toBoolean': value = Boolean(value); break;
        case 'trim': value = typeof value === 'string' ? value.trim() : value; break;
      }
    }

    this.context.variables[data.variableName] = value;
    result.variables = { [data.variableName]: value };
    result.status = EXECUTION_STATUS.SUCCESS;
  }

  /**
   * Execute assertion node — runs all assertions, collects per-assertion results
   */
  private async executeAssertion(node: Node, result: ExecutionResult): Promise<void> {
    const data = node.data as AssertionNodeData;
    const prevResult = [...this.context.results].reverse().find((r) => r.response);

    if (!prevResult || !prevResult.response) {
      throw new Error('No previous response to assert against');
    }

    const assertionResults: AssertionResult[] = [];
    let hasFailure = false;

    for (const assertion of data.assertions) {
      const ar: AssertionResult = {
        type: assertion.type,
        expression: assertion.expression,
        expected: assertion.expected,
        passed: false,
      };

      try {
        switch (assertion.type) {
          case 'status_code': {
            ar.actual = prevResult.response.statusCode;
            ar.passed = prevResult.response.statusCode === Number(assertion.expected);
            if (!ar.passed) ar.message = `Expected ${assertion.expected}, got ${prevResult.response.statusCode}`;
            break;
          }
          case 'jsonpath_exists': {
            const val = this.evaluateJsonPath(prevResult.response.body, assertion.expression!);
            ar.actual = val;
            ar.passed = val !== undefined;
            if (!ar.passed) ar.message = `${assertion.expression} not found`;
            break;
          }
          case 'jsonpath_equals': {
            const val = this.evaluateJsonPath(prevResult.response.body, assertion.expression!);
            ar.actual = val;
            ar.passed = String(val) === String(assertion.expected);
            if (!ar.passed) ar.message = `${assertion.expression}: expected "${assertion.expected}", got "${val}"`;
            break;
          }
          case 'jsonpath_not_equals': {
            const val = this.evaluateJsonPath(prevResult.response.body, assertion.expression!);
            ar.actual = val;
            ar.passed = String(val) !== String(assertion.expected);
            if (!ar.passed) ar.message = `${assertion.expression}: should not equal "${assertion.expected}"`;
            break;
          }
          case 'response_time': {
            const maxMs = Number(assertion.expected);
            const actualMs = prevResult.durationMs || 0;
            ar.actual = actualMs;
            ar.passed = actualMs <= maxMs;
            if (!ar.passed) ar.message = `Expected < ${maxMs}ms, got ${actualMs}ms`;
            break;
          }
          case 'contains': {
            const bodyStr = typeof prevResult.response.body === 'string'
              ? prevResult.response.body
              : JSON.stringify(prevResult.response.body);
            ar.passed = bodyStr.includes(String(assertion.expected || ''));
            if (!ar.passed) ar.message = `Body does not contain "${assertion.expected}"`;
            break;
          }
          case 'not_contains': {
            const bodyStr = typeof prevResult.response.body === 'string'
              ? prevResult.response.body
              : JSON.stringify(prevResult.response.body);
            ar.passed = !bodyStr.includes(String(assertion.expected || ''));
            if (!ar.passed) ar.message = `Body should not contain "${assertion.expected}"`;
            break;
          }
          case 'regex': {
            const bodyStr = typeof prevResult.response.body === 'string'
              ? prevResult.response.body
              : JSON.stringify(prevResult.response.body);
            const regex = new RegExp(String(assertion.expected || ''));
            ar.passed = regex.test(bodyStr);
            if (!ar.passed) ar.message = `Body does not match /${assertion.expected}/`;
            break;
          }
          case 'header_equals': {
            const headerName = (assertion.expression || '').toLowerCase();
            const headers = prevResult.response.headers || {};
            const headerValue = Object.entries(headers)
              .find(([k]) => k.toLowerCase() === headerName)?.[1];
            ar.actual = headerValue;
            ar.passed = String(headerValue) === String(assertion.expected);
            if (!ar.passed) ar.message = `Header ${assertion.expression}: expected "${assertion.expected}", got "${headerValue}"`;
            break;
          }
          case 'header_exists': {
            const headerName = (assertion.expression || '').toLowerCase();
            const headers = prevResult.response.headers || {};
            const exists = Object.keys(headers).some(k => k.toLowerCase() === headerName);
            ar.actual = exists;
            ar.passed = exists;
            if (!ar.passed) ar.message = `Header "${assertion.expression}" not found`;
            break;
          }
          default:
            ar.passed = true;
        }
      } catch (e: any) {
        ar.passed = false;
        ar.message = e.message;
      }

      assertionResults.push(ar);

      if (!ar.passed) {
        hasFailure = true;
        if (data.stopOnFirstFailure) break;
      }
    }

    result.variables = { _assertionResults: assertionResults };

    if (hasFailure) {
      const failures = assertionResults.filter(a => !a.passed);
      throw new Error(
        `${failures.length}/${assertionResults.length} assertion(s) failed: ${failures.map(f => f.message).join('; ')}`
      );
    }

    result.status = EXECUTION_STATUS.SUCCESS;
  }

  /**
   * Execute delay node — supports fixed, random, and variable-based delays
   */
  private async executeDelay(node: Node, result: ExecutionResult): Promise<void> {
    const delayType = node.data.delayType || 'fixed';
    let ms: number;

    if (delayType === 'random') {
      const minMs = node.data.minMs ?? 500;
      const maxMs = node.data.maxMs ?? 2000;
      ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    } else if (delayType === 'variable') {
      const varName = node.data.variableName || '';
      ms = Number(this.context.variables[varName]) || 1000;
    } else {
      ms = node.data.milliseconds || 1000;
    }

    await new Promise((resolve) => setTimeout(resolve, ms));
    result.variables = { _actualDelay: ms };
    result.status = EXECUTION_STATUS.SUCCESS;
  }

  /**
   * Execute conditional node — supports jsonpath, variable, and status_code sources
   */
  private async executeConditional(node: Node, result: ExecutionResult): Promise<void> {
    const data = node.data as ConditionalNodeData;
    const conditionSource = data.conditionSource || 'jsonpath';
    const prevResult = [...this.context.results].reverse().find((r) => r.response);

    let leftValue: any;

    if (conditionSource === 'status_code') {
      if (!prevResult || !prevResult.response) {
        throw new Error('No previous response to get status code from');
      }
      leftValue = prevResult.response.statusCode;
    } else if (conditionSource === 'variable') {
      leftValue = this.context.variables[data.condition];
    } else {
      // jsonpath (default)
      if (!prevResult || !prevResult.response) {
        throw new Error('No previous response to evaluate condition against');
      }
      leftValue = this.evaluateJsonPath(prevResult.response.body, data.condition);
    }

    const rightValue = this.substituteVariables(String(data.value || ''));
    let conditionMet = false;

    switch (data.operator) {
      case '==': conditionMet = String(leftValue) === String(rightValue); break;
      case '!=': conditionMet = String(leftValue) !== String(rightValue); break;
      case '>': conditionMet = Number(leftValue) > Number(rightValue); break;
      case '<': conditionMet = Number(leftValue) < Number(rightValue); break;
      case '>=': conditionMet = Number(leftValue) >= Number(rightValue); break;
      case '<=': conditionMet = Number(leftValue) <= Number(rightValue); break;
      case 'contains': conditionMet = String(leftValue).includes(String(rightValue)); break;
      case 'not_contains': conditionMet = !String(leftValue).includes(String(rightValue)); break;
      case 'exists': conditionMet = leftValue !== undefined && leftValue !== null; break;
      case 'not_exists': conditionMet = leftValue === undefined || leftValue === null; break;
      default: conditionMet = false;
    }

    result.variables = {
      _conditionResult: conditionMet,
      _conditionLeft: leftValue,
      _conditionRight: rightValue,
    };
    result.status = EXECUTION_STATUS.SUCCESS;
  }

  /**
   * Execute loop node — supports response, inline, and variable data sources
   */
  private async executeLoop(node: Node, result: ExecutionResult): Promise<void> {
    const data = node.data as LoopNodeData;
    const dataSource = data.dataSource || 'response';
    let array: any[];

    if (dataSource === 'inline') {
      try {
        array = JSON.parse(data.inlineData || '[]');
        if (!Array.isArray(array)) throw new Error('Inline data is not an array');
      } catch (e: any) {
        throw new Error(`Invalid inline JSON data: ${e.message}`);
      }
    } else if (dataSource === 'variable') {
      const varName = data.dataVariable || '';
      array = this.context.variables[varName];
      if (!Array.isArray(array)) {
        throw new Error(`Variable "${varName}" is not an array`);
      }
    } else {
      // response (default)
      const prevResult = [...this.context.results].reverse().find((r) => r.response);
      if (!prevResult || !prevResult.response) {
        throw new Error('No previous response to loop over');
      }
      array = this.evaluateJsonPath(prevResult.response.body, data.arrayPath);
      if (!Array.isArray(array)) {
        throw new Error(`Loop path ${data.arrayPath} did not resolve to an array`);
      }
    }

    const maxIter = data.maxIterations || 100;
    const items = array.slice(0, maxIter);
    const itemVar = data.itemVariable || '_currentItem';

    // Store loop items and count
    this.context.variables['_loopItems'] = items;
    this.context.variables['_loopCount'] = items.length;

    // Store each item by index
    items.forEach((item, idx) => {
      this.context.variables[`_loopItem_${idx}`] = item;
    });

    // Store first item as current item for simple flows
    if (items.length > 0) {
      this.context.variables[itemVar] = items[0];
      this.context.variables['_loopIndex'] = 0;
    }

    result.variables = {
      _loopCount: items.length,
      [itemVar]: items[0],
    };
    result.status = EXECUTION_STATUS.SUCCESS;
  }

  /**
   * Execute script node — with console.log capture and richer sandbox
   */
  private async executeScript(node: Node, result: ExecutionResult): Promise<void> {
    const script = node.data.script || '';
    if (!script.trim()) {
      result.status = EXECUTION_STATUS.SKIPPED;
      return;
    }

    const prevResult = [...this.context.results].reverse().find((r) => r.response);
    const logs: string[] = [];

    // Build sandbox with available context
    const sandbox = {
      variables: { ...this.context.variables },
      response: prevResult?.response || null,
      request: prevResult?.request || null,
      setVariable: (key: string, value: any) => {
        this.context.variables[key] = value;
      },
      console: {
        log: (...args: any[]) => { logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); },
        warn: (...args: any[]) => { logs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); },
        error: (...args: any[]) => { logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); },
      },
      JSON,
      Math,
      Date,
      parseInt,
      parseFloat,
      btoa,
      atob,
      encodeURIComponent,
      decodeURIComponent,
    };

    try {
      const fn = new Function(
        'variables', 'response', 'request', 'setVariable', 'console',
        'JSON', 'Math', 'Date', 'parseInt', 'parseFloat', 'btoa', 'atob',
        'encodeURIComponent', 'decodeURIComponent',
        script
      );
      fn(
        sandbox.variables, sandbox.response, sandbox.request,
        sandbox.setVariable, sandbox.console,
        sandbox.JSON, sandbox.Math, sandbox.Date,
        sandbox.parseInt, sandbox.parseFloat, sandbox.btoa, sandbox.atob,
        sandbox.encodeURIComponent, sandbox.decodeURIComponent
      );

      result.variables = {
        ...this.context.variables,
        _scriptLogs: logs,
        _scriptLogCount: logs.length,
      };
      result.status = EXECUTION_STATUS.SUCCESS;
    } catch (e: any) {
      throw new Error(`Script execution failed: ${e.message}`);
    }
  }

  /**
   * Execute parallel node — runs downstream branches concurrently (basic implementation)
   */
  private async executeParallel(node: Node, result: ExecutionResult): Promise<void> {
    // For now, parallel node acts as a pass-through that marks itself as executed
    // Full parallel execution requires graph walker refactoring
    result.variables = { _parallelStarted: true };
    result.status = EXECUTION_STATUS.SUCCESS;
  }

  /**
   * Build execution order using topological sort
   */
  private buildExecutionOrder(nodes: Node[], edges: Edge[], startNodeId: string): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const adjList = new Map<string, string[]>();

    // Build adjacency list
    edges.forEach((edge) => {
      if (!adjList.has(edge.source)) {
        adjList.set(edge.source, []);
      }
      adjList.get(edge.source)!.push(edge.target);
    });

    // DFS traversal
    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      order.push(nodeId);

      const children = adjList.get(nodeId) || [];
      children.forEach((childId) => dfs(childId));
    };

    dfs(startNodeId);
    return order;
  }

  /**
   * Substitute variables in string
   */
  private substituteVariables(input: string): any {
    if (typeof input !== 'string') return input;

    let result = input;
    const variablePattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;

    result = result.replace(variablePattern, (match, varName) => {
      // Support nested access like {{_currentItem.id}}
      const parts = varName.split('.');
      let value: any = this.context.variables[parts[0]];
      for (let i = 1; i < parts.length && value !== undefined; i++) {
        value = value?.[parts[i]];
      }
      return value !== undefined ? String(value) : match;
    });

    return result;
  }

  /**
   * JSONPath evaluator — supports:
   *   $.field, $.nested.field, $.items[0], $.items[0].name,
   *   $.data[*].id, $[0], $.store.book[?(@.price<10)]
   */
  private evaluateJsonPath(data: any, path: string): any {
    if (!path || path === '$') return data;

    // Remove leading $. or $
    let normalized = path.replace(/^\$\.?/, '');

    // Tokenize: split on dots but respect brackets
    const tokens: string[] = [];
    let current = '';
    let inBracket = false;
    for (const ch of normalized) {
      if (ch === '[') {
        if (current) tokens.push(current);
        current = '[';
        inBracket = true;
      } else if (ch === ']') {
        current += ']';
        tokens.push(current);
        current = '';
        inBracket = false;
      } else if (ch === '.' && !inBracket) {
        if (current) tokens.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    if (current) tokens.push(current);

    let result: any = data;

    for (const token of tokens) {
      if (result === undefined || result === null) return undefined;

      // Array index: [0], [1], etc.
      const indexMatch = token.match(/^\[(\d+)\]$/);
      if (indexMatch) {
        const idx = parseInt(indexMatch[1]);
        if (Array.isArray(result)) {
          result = result[idx];
        } else {
          return undefined;
        }
        continue;
      }

      // Wildcard: [*]
      if (token === '[*]') {
        if (Array.isArray(result)) continue;
        return undefined;
      }

      // Regular property access
      if (typeof result === 'object' && result !== null) {
        result = result[token];
      } else {
        return undefined;
      }
    }

    return result;
  }

  /**
   * Abort execution
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}

