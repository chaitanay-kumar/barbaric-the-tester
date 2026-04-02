import { StateCreator } from 'zustand';
import { ExecutionContext, ExecutionResult, ExecutionStatus } from '../../types/flow';
import { EXECUTION_STATUS } from '../../constants';

export interface ExecutionSlice {
  // State
  executionContext: ExecutionContext | null;
  isExecuting: boolean;
  executionResults: Map<string, ExecutionResult>;
  
  // Actions
  startExecution: () => void;
  stopExecution: () => void;
  updateNodeStatus: (nodeId: string, status: ExecutionStatus) => void;
  addExecutionResult: (result: ExecutionResult) => void;
  clearExecutionResults: () => void;
  setVariable: (name: string, value: any) => void;
  getVariable: (name: string) => any;
}

export const createExecutionSlice: StateCreator<ExecutionSlice> = (set, get) => ({
  executionContext: null,
  isExecuting: false,
  executionResults: new Map(),

  startExecution: () => {
    const context: ExecutionContext = {
      flowId: `exec-${Date.now()}`,
      variables: {},
      results: [],
    };

    set({
      isExecuting: true,
      executionContext: context,
      executionResults: new Map(),
    });
  },

  stopExecution: () => {
    set({
      isExecuting: false,
    });
  },

  updateNodeStatus: (nodeId: string, status: ExecutionStatus) => {
    // This will be used to update node visual state
    // Implementation will depend on how nodes access this state
  },

  addExecutionResult: (result: ExecutionResult) => {
    set((state) => {
      const newResults = new Map(state.executionResults);
      newResults.set(result.nodeId, result);

      return {
        executionResults: newResults,
        executionContext: state.executionContext
          ? {
              ...state.executionContext,
              results: [...state.executionContext.results, result],
            }
          : null,
      };
    });
  },

  clearExecutionResults: () => {
    set({
      executionResults: new Map(),
      executionContext: null,
    });
  },

  setVariable: (name: string, value: any) => {
    set((state) => ({
      executionContext: state.executionContext
        ? {
            ...state.executionContext,
            variables: {
              ...state.executionContext.variables,
              [name]: value,
            },
          }
        : null,
    }));
  },

  getVariable: (name: string) => {
    const { executionContext } = get();
    return executionContext?.variables[name];
  },
});

