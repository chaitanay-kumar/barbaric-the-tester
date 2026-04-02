import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { CheckCircle2 } from 'lucide-react';
import type { AssertionNodeData, ExecutionStatus } from '../../types/flow';
import clsx from 'clsx';

interface AssertionNodeComponentProps extends NodeProps {
  data: AssertionNodeData & { status?: ExecutionStatus };
}

const AssertionNode: React.FC<AssertionNodeComponentProps> = ({ data, selected }) => {
  const status = data.status || 'idle';

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
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 mb-1">
            {data.label}
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-normal">
              {data.assertions.length} check{data.assertions.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-1.5">
            {data.assertions.map((assertion, idx) => (
              <div key={idx} className="text-xs bg-gray-50 rounded px-2 py-1.5">
                <span className="font-semibold text-gray-700">{assertion.type}</span>
                {assertion.expression && (
                  <div className="mt-0.5 font-mono text-gray-600">{assertion.expression}</div>
                )}
                {assertion.expected !== undefined && (
                  <div className="mt-0.5 text-gray-600">
                    Expected: <code className="text-green-600">{JSON.stringify(assertion.expected)}</code>
                  </div>
                )}
              </div>
            ))}
          </div>

          {status === 'executing' && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-yellow-600">Validating...</span>
            </div>
          )}

          {status === 'success' && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600">All assertions passed</span>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs text-red-600">Assertion failed</span>
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
    </div>
  );
};

export default memo(AssertionNode);

