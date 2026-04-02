import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Database } from 'lucide-react';
import type { VariableExtractorNodeData, ExecutionStatus } from '../../types/flow';
import clsx from 'clsx';

const sourceLabels: Record<string, string> = {
  body: 'Body',
  headers: 'Headers',
  status: 'Status',
};

interface VariableExtractorNodeComponentProps extends NodeProps {
  data: VariableExtractorNodeData & { status?: ExecutionStatus; _extractedValue?: any };
}

const VariableExtractorNode: React.FC<VariableExtractorNodeComponentProps> = ({
  data,
  selected,
}) => {
  const status = data.status || 'idle';
  const source = data.source || 'body';

  return (
    <div
      className={clsx(
        'custom-node px-4 py-3 min-w-[250px]',
        {
          'border-blue-500': selected,
          'border-green-500': status === 'success',
          'border-red-500': status === 'error',
          'border-yellow-500': status === 'executing',
          'border-gray-300': status === 'idle',
        }
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <Database className="w-5 h-5 text-purple-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">{data.label}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-medium">
              {sourceLabels[source] || source}
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-gray-600">
              <span className="font-semibold">Extract:</span>
              <code className="ml-1 px-1 py-0.5 bg-gray-100 rounded text-xs font-mono">
                {source === 'status' ? 'statusCode' : data.jsonPath}
              </code>
            </div>

            <div className="text-xs text-gray-600">
              <span className="font-semibold">→</span>
              <code className="ml-1 px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono">
                {`{{${data.variableName}}}`}
              </code>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {data.transform && data.transform !== 'none' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
                  {data.transform}
                </span>
              )}
              {data.defaultValue && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600">
                  default: {data.defaultValue}
                </span>
              )}
            </div>
          </div>

          {status === 'executing' && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-yellow-600">Extracting...</span>
            </div>
          )}

          {status === 'success' && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600 truncate">Extracted</span>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs text-red-600">Failed</span>
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
    </div>
  );
};

export default memo(VariableExtractorNode);

