import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Clock } from 'lucide-react';
import clsx from 'clsx';

const DelayNode: React.FC<NodeProps> = ({ data, selected }) => {
  const status = data.status || 'idle';
  const delayType = data.delayType || 'fixed';
  const ms = data.milliseconds ?? 1000;

  // Build display string
  let display: string;
  if (delayType === 'random') {
    const minD = data.minMs ?? 500;
    const maxD = data.maxMs ?? 2000;
    display = `${minD}–${maxD}ms`;
  } else if (delayType === 'variable') {
    display = `{{${data.variableName || '?'}}}`;
  } else {
    display = ms >= 1000 ? `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s` : `${ms}ms`;
  }

  return (
    <div
      className={clsx(
        'custom-node px-4 py-3 min-w-[200px] bg-gradient-to-r from-yellow-50 to-yellow-100',
        {
          'border-blue-500': selected,
          'border-green-500': status === 'success',
          'border-red-500': status === 'error',
          'border-yellow-500': status === 'executing',
          'border-yellow-300': status === 'idle' && !selected,
        }
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-yellow-500" />

      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-yellow-900">{data.label || 'Delay'}</span>
            {delayType !== 'fixed' && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-200/60 text-yellow-700">
                {delayType}
              </span>
            )}
          </div>
          <div className="text-xs text-yellow-700 font-medium font-mono">{display}</div>
          {status === 'executing' && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-xs text-yellow-600">Waiting...</span>
            </div>
          )}
          {status === 'success' && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-green-600">Done</span>
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-yellow-500" />
    </div>
  );
};

export default memo(DelayNode);
