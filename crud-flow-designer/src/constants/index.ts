// Node type constants
export const NODE_TYPES = {
  START: 'start',
  HTTP_REQUEST: 'http-request',
  VARIABLE_EXTRACTOR: 'variable-extractor',
  ASSERTION: 'assertion',
  DELAY: 'delay',
  CONDITIONAL: 'conditional',
  LOOP: 'loop',
  SCRIPT: 'script',
  PARALLEL: 'parallel',
} as const;

// HTTP Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
} as const;

// Execution statuses
export const EXECUTION_STATUS = {
  IDLE: 'idle',
  EXECUTING: 'executing',
  SUCCESS: 'success',
  ERROR: 'error',
  SKIPPED: 'skipped',
} as const;

// Auth types
export const AUTH_TYPES = {
  NONE: 'none',
  BEARER: 'bearer',
  BASIC: 'basic',
  API_KEY: 'api-key',
} as const;

// Assertion types
export const ASSERTION_TYPES = {
  STATUS_CODE: 'status_code',
  JSONPATH_EXISTS: 'jsonpath_exists',
  JSONPATH_EQUALS: 'jsonpath_equals',
  SCHEMA_VALID: 'schema_valid',
  RESPONSE_TIME: 'response_time',
  CONTAINS: 'contains',
  REGEX: 'regex',
  HEADER_EQUALS: 'header_equals',
} as const;

// Node colors for visualization
export const NODE_COLORS = {
  [NODE_TYPES.START]: '#3b82f6',
  [NODE_TYPES.HTTP_REQUEST]: '#10b981',
  [NODE_TYPES.VARIABLE_EXTRACTOR]: '#a855f7',
  [NODE_TYPES.ASSERTION]: '#22c55e',
  [NODE_TYPES.DELAY]: '#f59e0b',
  [NODE_TYPES.CONDITIONAL]: '#f97316',
  [NODE_TYPES.LOOP]: '#ec4899',
  [NODE_TYPES.SCRIPT]: '#6366f1',
  [NODE_TYPES.PARALLEL]: '#14b8a6',
} as const;

// Default node data factory
export const DEFAULT_NODE_DATA = {
  [NODE_TYPES.START]: () => ({
    label: 'Start',
    baseUrl: 'https://api.example.com',
    auth: { type: AUTH_TYPES.NONE },
    headers: {},
    globalTimeout: 30000,
    globalRetries: 0,
  }),
  [NODE_TYPES.HTTP_REQUEST]: () => ({
    label: 'HTTP Request',
    method: HTTP_METHODS.GET,
    path: '/endpoint',
    description: '',
    headers: {},
  }),
  [NODE_TYPES.VARIABLE_EXTRACTOR]: () => ({
    label: 'Extract Variable',
    jsonPath: '$.id',
    variableName: 'extractedValue',
    source: 'body',
    defaultValue: '',
    transform: 'none',
  }),
  [NODE_TYPES.ASSERTION]: () => ({
    label: 'Assertion',
    assertions: [
      {
        type: ASSERTION_TYPES.STATUS_CODE,
        expected: 200,
      },
    ],
    stopOnFirstFailure: false,
  }),
  [NODE_TYPES.DELAY]: () => ({
    label: 'Delay',
    milliseconds: 1000,
    delayType: 'fixed',
  }),
  [NODE_TYPES.CONDITIONAL]: () => ({
    label: 'Conditional',
    conditionSource: 'status_code',
    condition: '',
    operator: '==',
    value: '200',
  }),
  [NODE_TYPES.LOOP]: () => ({
    label: 'Loop',
    dataSource: 'response',
    arrayPath: '$.items',
    itemVariable: '_currentItem',
    maxIterations: 100,
  }),
  [NODE_TYPES.SCRIPT]: () => ({
    label: 'Script',
    script: '// Available: variables, response, request, setVariable(key, val), console.log()\n\nconst data = response?.body;\nconsole.log("Response:", data);\nreturn { success: true };',
    description: '',
  }),
  [NODE_TYPES.PARALLEL]: () => ({
    label: 'Parallel',
    maxConcurrent: 5,
    failFast: false,
  }),
} as const;

// Storage keys
export const STORAGE_KEYS = {
  FLOWS: 'crud-flow-designer:flows',
  CURRENT_FLOW_ID: 'crud-flow-designer:current-flow-id',
  PREFERENCES: 'crud-flow-designer:preferences',
} as const;

// Canvas settings
export const CANVAS_CONFIG = {
  DEFAULT_ZOOM: 1,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 4,
  GRID_SIZE: 40,
} as const;

// Execution settings
export const EXECUTION_CONFIG = {
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 1,
  RETRY_DELAY: 1000, // 1 second
} as const;

