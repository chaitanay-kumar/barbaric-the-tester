import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { FlowSlice, createFlowSlice } from './slices/flowSlice';
import { CanvasSlice, createCanvasSlice } from './slices/canvasSlice';
import { ExecutionSlice, createExecutionSlice } from './slices/executionSlice';

// Combined store type
export type AppStore = FlowSlice & CanvasSlice & ExecutionSlice;

// Create the combined store
export const useAppStore = create<AppStore>()(
  devtools(
    (...args) => ({
      ...createFlowSlice(...args),
      ...createCanvasSlice(...args),
      ...createExecutionSlice(...args),
    }),
    { name: 'CRUDFlowDesigner' }
  )
);

// Selectors for better performance
export const useFlowSelector = () =>
  useAppStore((state) => ({
    flows: state.flows,
    currentFlow: state.currentFlow,
    createFlow: state.createFlow,
    loadFlow: state.loadFlow,
    updateFlow: state.updateFlow,
    deleteFlow: state.deleteFlow,
  }));

export const useCanvasSelector = () =>
  useAppStore((state) => ({
    nodes: state.nodes,
    edges: state.edges,
    selectedNodeId: state.selectedNodeId,
    addNode: state.addNode,
    addNodeAtPosition: state.addNodeAtPosition,
    updateNode: state.updateNode,
    deleteNode: state.deleteNode,
    setNodes: state.setNodes,
    addEdge: state.addEdge,
    deleteEdge: state.deleteEdge,
    setEdges: state.setEdges,
    selectNode: state.selectNode,
  }));

export const useExecutionSelector = () =>
  useAppStore((state) => ({
    isExecuting: state.isExecuting,
    executionContext: state.executionContext,
    executionResults: state.executionResults,
    startExecution: state.startExecution,
    stopExecution: state.stopExecution,
    addExecutionResult: state.addExecutionResult,
    clearExecutionResults: state.clearExecutionResults,
  }));

// Specific selectors for individual pieces of state
export const useCurrentFlow = () => useAppStore((state) => state.currentFlow);
export const useNodes = () => useAppStore((state) => state.nodes);
export const useEdges = () => useAppStore((state) => state.edges);
export const useIsExecuting = () => useAppStore((state) => state.isExecuting);
export const useSelectedNode = () => useAppStore((state) => state.selectedNodeId);

