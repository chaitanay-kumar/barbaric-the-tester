import { useCallback, useEffect } from 'react';
import { useAppStore } from '../store';
import {
  exportFlowAsJson,
  importFlowFromJson,
  downloadFlowAsFile,
} from '../utils/storageUtils';

/**
 * Hook for managing flow export/import
 */
export const useFlowIO = () => {
  const currentFlow = useAppStore((state) => state.currentFlow);
  const setCurrentFlow = useAppStore((state) => state.setCurrentFlow);
  const updateFlow = useAppStore((state) => state.updateFlow);

  const exportFlow = useCallback((): string => {
    if (!currentFlow) return '';
    return exportFlowAsJson(currentFlow);
  }, [currentFlow]);

  const importFlow = useCallback(
    (jsonString: string): boolean => {
      const flow = importFlowFromJson(jsonString);
      if (flow) {
        setCurrentFlow(flow);
        return true;
      }
      return false;
    },
    [setCurrentFlow]
  );

  const downloadFlow = useCallback(() => {
    if (currentFlow) {
      downloadFlowAsFile(currentFlow);
    }
  }, [currentFlow]);

  const importFromFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          importFlow(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [importFlow]);

  return {
    exportFlow,
    importFlow,
    downloadFlow,
    importFromFile,
  };
};

