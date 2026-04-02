import { Node, Edge } from 'reactflow';

// HTTP Methods
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// Auth Types
export type AuthType = 'none' | 'bearer' | 'basic' | 'api-key';

export interface AuthConfig {
  type: AuthType;
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiKeyHeader?: string;
}

// ── Environments ──
export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

// ── Query Params ──
export interface QueryParam {
  key: string;
  value: string;
  enabled: boolean;
}

// Node Types
export type NodeType = 
  | 'start'
  | 'http-request'
  | 'variable-extractor'
  | 'assertion'
  | 'delay'
  | 'conditional'
  | 'loop'
  | 'script'
  | 'parallel';

// Node Data Interfaces
export interface StartNodeData {
  label: string;
  baseUrl: string;
  auth?: AuthConfig;
  headers?: Record<string, string>;       // Global headers applied to all requests
  globalTimeout?: number;                  // Default timeout for all requests (ms)
  globalRetries?: number;                  // Default retry count for all requests
}

export type BodyType = 'json' | 'form-urlencoded' | 'form-data' | 'raw' | 'none';

export interface FormDataEntry {
  key: string;
  value: string;
  type: 'text' | 'file';
  enabled: boolean;
}

export interface HttpRequestNodeData {
  label: string;
  method: HTTPMethod;
  path: string;
  description?: string;                   // Document what this request does
  headers?: Record<string, string>;
  body?: any;
  bodyType?: BodyType;
  formData?: FormDataEntry[];
  queryParams?: QueryParam[];
  authOverride?: AuthConfig;
  timeout?: number;                        // Per-node timeout in ms (overrides global)
  maxRetries?: number;                     // Per-node retry count (overrides global)
}

export interface VariableExtractorNodeData {
  label: string;
  jsonPath: string;
  variableName: string;
  source?: 'body' | 'headers' | 'status';
  defaultValue?: string;                   // Fallback if extraction returns undefined
  transform?: 'none' | 'toString' | 'toNumber' | 'toBoolean' | 'trim';
}

export interface AssertionNodeData {
  label: string;
  assertions: Array<{
    type: 'status_code' | 'jsonpath_exists' | 'jsonpath_equals' | 'jsonpath_not_equals'
      | 'schema_valid' | 'response_time' | 'contains' | 'not_contains' | 'regex'
      | 'header_equals' | 'header_exists';
    expression?: string;
    expected?: any;
  }>;
  stopOnFirstFailure?: boolean;            // Default false — run all assertions
}

export interface AssertionResult {
  type: string;
  expression?: string;
  expected?: any;
  actual?: any;
  passed: boolean;
  message?: string;
}

export interface DelayNodeData {
  label: string;
  milliseconds: number;
  delayType?: 'fixed' | 'random' | 'variable';   // Default 'fixed'
  minMs?: number;                                   // For random type
  maxMs?: number;                                   // For random type
  variableName?: string;                            // For variable type
}

export interface ConditionalNodeData {
  label: string;
  conditionSource?: 'jsonpath' | 'variable' | 'status_code'; // Default 'jsonpath'
  condition: string;                       // JSONPath expression, variable name, or ignored for status_code
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_contains' | 'exists' | 'not_exists';
  value: any;
}

export interface LoopNodeData {
  label: string;
  dataSource?: 'response' | 'inline' | 'variable';  // Default 'response'
  arrayPath: string;                       // JSONPath to array (for response source)
  inlineData?: string;                     // JSON array string (for inline source)
  dataVariable?: string;                   // Variable name (for variable source)
  itemVariable?: string;                   // Name for current item variable (default '_currentItem')
  maxIterations?: number;
}

export interface ScriptNodeData {
  label: string;
  script: string;                          // JavaScript code
  description?: string;                    // What does this script do
}

export interface ParallelNodeData {
  label: string;
  maxConcurrent?: number;
  failFast?: boolean;                      // Stop all branches if one fails (default false)
}

// Execution Status
export type ExecutionStatus = 'idle' | 'executing' | 'success' | 'error' | 'skipped';

// Execution Result
export interface ExecutionResult {
  nodeId: string;
  status: ExecutionStatus;
  startTime?: Date;
  endTime?: Date;
  durationMs?: number;
  request?: {
    method: HTTPMethod;
    url: string;
    headers?: Record<string, string>;
    body?: any;
  };
  response?: {
    statusCode: number;
    headers?: Record<string, string>;
    body?: any;
  };
  error?: string;
  variables?: Record<string, any>;
}

// Flow Configuration
export interface FlowConfig {
  id: string;
  name: string;
  description?: string;
  version: string;
  baseUrl?: string;
  auth?: AuthConfig;
  variables?: Record<string, any>;
  nodes: Node[];
  edges: Edge[];
  createdAt?: string;
  updatedAt?: string;
}

// Execution Context
export interface ExecutionContext {
  flowId: string;
  variables: Record<string, any>;
  results: ExecutionResult[];
  currentNode?: string;
}

// Store State
export interface FlowStore {
  // Flow management
  flows: FlowConfig[];
  currentFlow: FlowConfig | null;
  
  // Environments
  environments: Environment[];
  activeEnvironmentId: string | null;
  
  // Execution
  executionContext: ExecutionContext | null;
  isExecuting: boolean;
  nodeStatuses: Record<string, ExecutionStatus>;
  executionResults: ExecutionResult[];
  executionLog: string[];
  
  // Selection
  selectedNodeId: string | null;
  
  // Undo/Redo
  undoStack: Array<{ nodes: Node[]; edges: Edge[] }>;
  redoStack: Array<{ nodes: Node[]; edges: Edge[] }>;
  canUndo: boolean;
  canRedo: boolean;
  
  // Actions
  createFlow: (name: string) => void;
  loadFlow: (flow: FlowConfig) => void;
  saveFlow: () => void;
  deleteFlow: (flowId: string) => void;
  updateFlowConfig: (updates: Partial<FlowConfig>) => void;
  
  // Environment actions
  addEnvironment: (env: Environment) => void;
  updateEnvironment: (envId: string, updates: Partial<Environment>) => void;
  deleteEnvironment: (envId: string) => void;
  setActiveEnvironment: (envId: string | null) => void;
  getResolvedVariables: () => Record<string, string>;
  
  // Node/Edge actions
  addNode: (node: Node) => void;
  updateNode: (nodeId: string, data: any) => void;
  deleteNode: (nodeId: string) => void;
  syncNodePositions: (positionUpdates: Array<{ id: string; position: { x: number; y: number } }>) => void;
  addEdge: (edge: Edge) => void;
  deleteEdge: (edgeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  duplicateNode: (nodeId: string) => void;
  
  // Undo/Redo actions
  pushUndoSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  
  // Execution actions
  startExecution: () => Promise<void>;
  stopExecution: () => void;
  updateExecutionResult: (result: ExecutionResult) => void;
  setNodeStatus: (nodeId: string, status: ExecutionStatus) => void;
  addLogEntry: (entry: string) => void;
  clearExecution: () => void;
  
  // Export/Import
  exportFlow: () => string;
  importFlow: (json: string) => void;
}

