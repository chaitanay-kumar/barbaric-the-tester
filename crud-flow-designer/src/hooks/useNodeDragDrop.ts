import { useCallback } from 'react';
import { useAppStore } from '../store';
import { createNode } from '../utils/nodeUtils';

/**
 * Hook for managing node drag and drop
 */
export const useNodeDragDrop = () => {
  const addNode = useAppStore((state) => state.addNode);

  const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent, reactFlowInstance: any) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = createNode(type, position);
      addNode(newNode);
    },
    [addNode]
  );

  return {
    onDragStart,
    onDragOver,
    onDrop,
  };
};

