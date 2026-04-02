import { useCallback } from 'react';
import { useAppStore } from '../store';
import { ExecutionEngine } from '../services/executionEngine';
import { EXECUTION_STATUS } from '../constants';

/**
 * Hook for managing flow execution
 */
export const useFlowExecution = () => {
  const currentFlow = useAppStore((state) => state.currentFlow);
  const nodes = useAppStore((state) => state.nodes);
  const edges = useAppStore((state) => state.edges);
  const isExecuting = useAppStore((state) => state.isExecuting);
  const startExecution = useAppStore((state) => state.startExecution);
  const stopExecution = useAppStore((state) => state.stopExecution);
  const addExecutionResult = useAppStore((state) => state.addExecutionResult);
  const updateNode = useAppStore((state) => state.updateNode);
  const clearExecutionResults = useAppStore((state) => state.clearExecutionResults);

  let executionEngine: ExecutionEngine | null = null;

  const executeFlow = useCallback(async () => {
    if (!currentFlow || isExecuting) return;

    // Clear previous results
    clearExecutionResults();

    // Reset all node statuses
    nodes.forEach((node) => {
      updateNode(node.id, { status: EXECUTION_STATUS.IDLE });
    });

    // Start execution
    startExecution();

    try {
      executionEngine = new ExecutionEngine(currentFlow.id);

      await executionEngine.executeFlow(
        nodes,
        edges,
        // On node status update
        (nodeId, status) => {
          updateNode(nodeId, { status });
        },
        // On result
        (result) => {
          addExecutionResult(result);
        }
      );
    } catch (error) {
      console.error('Flow execution failed:', error);
    } finally {
      stopExecution();
    }
  }, [
    currentFlow,
    nodes,
    edges,
    isExecuting,
    startExecution,
    stopExecution,
    addExecutionResult,
    updateNode,
    clearExecutionResults,
  ]);

  const abortExecution = useCallback(() => {
    if (executionEngine) {
      executionEngine.abort();
    }
    stopExecution();
  }, [stopExecution]);

  return {
    executeFlow,
    abortExecution,
    isExecuting,
  };
};

