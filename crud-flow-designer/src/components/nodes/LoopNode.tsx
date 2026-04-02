import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Repeat } from 'lucide-react';
import clsx from 'clsx';

const dataSourceLabels: Record<string, string> = {
  response: 'Response',
  inline: 'Inline',
  variable: 'Variable',
};

const LoopNode: React.FC<NodeProps> = ({ data, selected }) => {
  const status = data.status || 'idle';
  const source = data.dataSource || 'response';
  const itemVar = data.itemVariable || '_currentItem';
  const loopCount = data._loopCount;

  return (
    <div
      className={clsx(
        'custom-node px-4 py-3 min-w-[240px] bg-gradient-to-r from-pink-50 to-pink-100',
        {
          'border-blue-500': selected,
          'border-green-500': status === 'success',
          'border-red-500': status === 'error',
          'border-yellow-500': status === 'executing',
          'border-pink-300': status === 'idle' && !selected,
        }
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-pink-500" />

      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
            <Repeat className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-pink-900">{data.label || 'Loop'}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-pink-200/60 text-pink-700">
              {dataSourceLabels[source] || source}
            </span>
          </div>

          {source === 'response' && (
            <div className="text-xs text-pink-700 font-mono truncate">{data.arrayPath}</div>
          )}
          {source === 'variable' && (
            <div className="text-xs text-pink-700 font-mono truncate">{`{{${data.dataVariable || '?'}}}`}</div>
          )}
          {source === 'inline' && (
            <div className="text-xs text-pink-700">Inline data</div>
          )}

          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-xs px-1.5 py-0.5 rounded bg-pink-100 text-pink-600 font-mono">
              → {`{{${itemVar}}}`}
            </span>
            <span className="text-xs text-pink-500">max {data.maxIterations || 100}</span>
          </div>

          {status === 'executing' && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-xs text-yellow-600">Iterating...</span>
            </div>
          )}
          {status === 'success' && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-green-600">
                {loopCount !== undefined ? `${loopCount} item${loopCount !== 1 ? 's' : ''}` : 'Complete'}
              </span>
            </div>
          )}
          {status === 'error' && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-xs text-red-600">Failed</span>
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-pink-500" />
    </div>
  );
};

export default memo(LoopNode);

