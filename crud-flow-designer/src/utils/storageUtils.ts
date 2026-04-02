import { FlowConfig } from '../types/flow';
import { STORAGE_KEYS } from '../constants';

/**
 * Save flow to localStorage
 */
export const saveFlowToStorage = (flow: FlowConfig): void => {
  try {
    const key = `${STORAGE_KEYS.FLOWS}:${flow.id}`;
    localStorage.setItem(key, JSON.stringify(flow));
  } catch (error) {
    console.error('Failed to save flow to localStorage:', error);
  }
};

/**
 * Load flow from localStorage
 */
export const loadFlowFromStorage = (flowId: string): FlowConfig | null => {
  try {
    const key = `${STORAGE_KEYS.FLOWS}:${flowId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load flow from localStorage:', error);
    return null;
  }
};

/**
 * Delete flow from localStorage
 */
export const deleteFlowFromStorage = (flowId: string): void => {
  try {
    const key = `${STORAGE_KEYS.FLOWS}:${flowId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to delete flow from localStorage:', error);
  }
};

/**
 * Get all flow IDs from localStorage
 */
export const getAllFlowIds = (): string[] => {
  try {
    const keys = Object.keys(localStorage);
    const flowKeys = keys.filter((key) => key.startsWith(STORAGE_KEYS.FLOWS));
    return flowKeys.map((key) => key.replace(`${STORAGE_KEYS.FLOWS}:`, ''));
  } catch (error) {
    console.error('Failed to get flow IDs from localStorage:', error);
    return [];
  }
};

/**
 * Save current flow ID
 */
export const saveCurrentFlowId = (flowId: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_FLOW_ID, flowId);
  } catch (error) {
    console.error('Failed to save current flow ID:', error);
  }
};

/**
 * Get current flow ID
 */
export const getCurrentFlowId = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_FLOW_ID);
  } catch (error) {
    console.error('Failed to get current flow ID:', error);
    return null;
  }
};

/**
 * Export flow as JSON string
 */
export const exportFlowAsJson = (flow: FlowConfig): string => {
  return JSON.stringify(flow, null, 2);
};

/**
 * Import flow from JSON string
 */
export const importFlowFromJson = (jsonString: string): FlowConfig | null => {
  try {
    const flow = JSON.parse(jsonString) as FlowConfig;
    // Validate basic structure
    if (!flow.id || !flow.name || !Array.isArray(flow.nodes) || !Array.isArray(flow.edges)) {
      throw new Error('Invalid flow structure');
    }
    return flow;
  } catch (error) {
    console.error('Failed to import flow from JSON:', error);
    return null;
  }
};

/**
 * Download flow as JSON file
 */
export const downloadFlowAsFile = (flow: FlowConfig): void => {
  try {
    const json = exportFlowAsJson(flow);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${flow.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download flow as file:', error);
  }
};

