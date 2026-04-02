import { useEffect } from 'react';
import { useAppStore } from '../store';

/**
 * Hook to sync canvas state with flow state
 */
export const useFlowSync = () => {
  const currentFlow = useAppStore((state) => state.currentFlow);
  const nodes = useAppStore((state) => state.nodes);
  const edges = useAppStore((state) => state.edges);
  const setNodes = useAppStore((state) => state.setNodes);
  const setEdges = useAppStore((state) => state.setEdges);
  const updateFlow = useAppStore((state) => state.updateFlow);

  // Sync current flow to canvas when flow changes
  useEffect(() => {
    if (currentFlow) {
      setNodes(currentFlow.nodes);
      setEdges(currentFlow.edges);
    }
  }, [currentFlow?.id]); // Only trigger on flow ID change

  // Sync canvas changes back to flow
  useEffect(() => {
    if (currentFlow && (nodes.length > 0 || edges.length > 0)) {
      // Debounce this in production
      updateFlow({ nodes, edges });
    }
  }, [nodes, edges]);
};

