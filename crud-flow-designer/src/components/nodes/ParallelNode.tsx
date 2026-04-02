import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Layers, Zap } from 'lucide-react';
import clsx from 'clsx';

const ParallelNode: React.FC<NodeProps> = ({ data, selected }) => {
  const status = data.status || 'idle';
  const failFast = data.failFast ?? false;

  return (
    <div
      className={clsx(
        'custom-node px-4 py-3 min-w-[220px] bg-gradient-to-r from-teal-50 to-teal-100',
        {
          'border-blue-500': selected,
          'border-green-500': status === 'success',
          'border-red-500': status === 'error',
          'border-yellow-500': status === 'executing',
          'border-teal-300': status === 'idle' && !selected,
        }
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-teal-500" />

      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-teal-900 mb-1">{data.label || 'Parallel'}</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs px-1.5 py-0.5 rounded bg-teal-200/60 text-teal-700">
              max {data.maxConcurrent ?? 5} concurrent
            </span>
            {failFast && (
              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                <Zap className="w-3 h-3" />
                fail-fast
              </span>
            )}
          </div>
          {status === 'executing' && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-xs text-yellow-600">Running branches...</span>
            </div>
          )}
          {status === 'success' && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-green-600">All branches done</span>
            </div>
          )}
          {status === 'error' && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-xs text-red-600">Branch failed</span>
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-teal-500" />
    </div>
  );
};

export default memo(ParallelNode);

