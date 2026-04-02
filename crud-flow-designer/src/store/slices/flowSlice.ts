import { StateCreator } from 'zustand';
import { Node } from 'reactflow';
import { FlowConfig } from '../../types/flow';
import { generateFlowId } from '../../utils/nodeUtils';
import { saveFlowToStorage, loadFlowFromStorage } from '../../utils/storageUtils';

export interface FlowSlice {
  // State
  flows: FlowConfig[];
  currentFlow: FlowConfig | null;
  
  // Actions
  createFlow: (name: string) => void;
  loadFlow: (flowId: string) => void;
  updateFlow: (updates: Partial<FlowConfig>) => void;
  deleteFlow: (flowId: string) => void;
  setCurrentFlow: (flow: FlowConfig | null) => void;
}

export const createFlowSlice: StateCreator<FlowSlice> = (set, get) => ({
  flows: [],
  currentFlow: null,

  createFlow: (name: string) => {
    const newFlow: FlowConfig = {
      id: generateFlowId(),
      name,
      version: '1.0',
      nodes: [],
      edges: [],
      variables: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      flows: [...state.flows, newFlow],
      currentFlow: newFlow,
    }));

    // Auto-save to localStorage
    saveFlowToStorage(newFlow);
  },

  loadFlow: (flowId: string) => {
    const flow = loadFlowFromStorage(flowId);
    if (flow) {
      set({ currentFlow: flow });
    }
  },

  updateFlow: (updates: Partial<FlowConfig>) => {
    set((state) => {
      if (!state.currentFlow) return state;

      const updatedFlow = {
        ...state.currentFlow,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Update in flows array
      const updatedFlows = state.flows.map((f) =>
        f.id === updatedFlow.id ? updatedFlow : f
      );

      // Auto-save to localStorage
      saveFlowToStorage(updatedFlow);

      return {
        currentFlow: updatedFlow,
        flows: updatedFlows,
      };
    });
  },

  deleteFlow: (flowId: string) => {
    set((state) => ({
      flows: state.flows.filter((f) => f.id !== flowId),
      currentFlow: state.currentFlow?.id === flowId ? null : state.currentFlow,
    }));
  },

  setCurrentFlow: (flow: FlowConfig | null) => {
    set({ currentFlow: flow });
  },
});

