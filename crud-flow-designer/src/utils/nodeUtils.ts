import { Node } from 'reactflow';
import { DEFAULT_NODE_DATA, NODE_TYPES } from '../constants';

/**
 * Generate a unique node ID
 */
export const generateNodeId = (type: string): string => {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate a unique flow ID
 */
export const generateFlowId = (): string => {
  return `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a new node with default data
 */
export const createNode = (type: string, position: { x: number; y: number }): Node => {
  const id = generateNodeId(type);
  const dataFactory = DEFAULT_NODE_DATA[type as keyof typeof DEFAULT_NODE_DATA];
  
  return {
    id,
    type,
    position,
    data: dataFactory ? dataFactory() : { label: `New ${type}` },
  };
};

/**
 * Validate node data based on type
 */
export const validateNodeData = (type: string, data: any): boolean => {
  switch (type) {
    case NODE_TYPES.START:
      return !!data.baseUrl;
    case NODE_TYPES.HTTP_REQUEST:
      return !!data.method && !!data.path;
    case NODE_TYPES.VARIABLE_EXTRACTOR:
      return !!data.jsonPath && !!data.variableName;
    case NODE_TYPES.ASSERTION:
      return Array.isArray(data.assertions) && data.assertions.length > 0;
    default:
      return true;
  }
};

/**
 * Check if a node is a terminal node (no outputs)
 */
export const isTerminalNode = (type: string): boolean => {
  return type === NODE_TYPES.ASSERTION;
};

/**
 * Check if a node can have multiple outputs
 */
export const canHaveMultipleOutputs = (type: string): boolean => {
  return type === NODE_TYPES.CONDITIONAL || type === NODE_TYPES.PARALLEL;
};

/**
 * Get node display name
 */
export const getNodeDisplayName = (type: string): string => {
  const names: Record<string, string> = {
    [NODE_TYPES.START]: 'Start',
    [NODE_TYPES.HTTP_REQUEST]: 'HTTP Request',
    [NODE_TYPES.VARIABLE_EXTRACTOR]: 'Variable Extractor',
    [NODE_TYPES.ASSERTION]: 'Assertion',
    [NODE_TYPES.DELAY]: 'Delay',
    [NODE_TYPES.CONDITIONAL]: 'Conditional',
    [NODE_TYPES.LOOP]: 'Loop',
    [NODE_TYPES.SCRIPT]: 'Script',
    [NODE_TYPES.PARALLEL]: 'Parallel',
  };
  return names[type] || type;
};

