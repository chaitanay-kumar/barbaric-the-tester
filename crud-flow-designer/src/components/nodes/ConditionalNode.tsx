import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';
import clsx from 'clsx';

const sourceIcons: Record<string, string> = {
  jsonpath: '$..',
  variable: '{{}}',
  status_code: 'HTTP',
};

const ConditionalNode: React.FC<NodeProps> = ({ data, selected }) => {
  const status = data.status || 'idle';
  const source = data.conditionSource || 'jsonpath';
  const conditionResult = data._conditionResult;

  // Build human-readable condition summary
  const leftDisplay = source === 'status_code' ? 'status' : (data.condition || '?');
  const operatorDisplay = data.operator || '==';
  const rightDisplay = data.value ?? '?';

  return (
    <div
      className={clsx(
        'custom-node px-4 py-3 min-w-[240px] bg-gradient-to-r from-orange-50 to-orange-100',
        {
          'border-blue-500': selected,
          'border-green-500': status === 'success',
          'border-red-500': status === 'error',
          'border-yellow-500': status === 'executing',
          'border-orange-300': status === 'idle' && !selected,
        }
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-orange-500" />

      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-orange-900">{data.label || 'Conditional'}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-orange-200/60 text-orange-700 font-mono">
              {sourceIcons[source] || source}
            </span>
          </div>
          <div className="text-xs text-orange-700 font-mono truncate">
            {leftDisplay} {operatorDisplay} {rightDisplay}
          </div>
          {status === 'executing' && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-xs text-yellow-600">Evaluating...</span>
            </div>
          )}
          {status === 'success' && conditionResult !== undefined && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className={clsx('w-2 h-2 rounded-full', conditionResult ? 'bg-green-500' : 'bg-red-400')} />
              <span className={clsx('text-xs font-medium', conditionResult ? 'text-green-600' : 'text-red-500')}>
                → {conditionResult ? 'True' : 'False'} branch
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

      {/* True / False output labels */}
      <div className="flex justify-between mt-2 px-1 text-xs font-semibold">
        <span className={clsx('transition-opacity', (status === 'success' && conditionResult) ? 'text-green-600' : 'text-green-600/50')}>
          ✓ True
        </span>
        <span className={clsx('transition-opacity', (status === 'success' && conditionResult !== undefined && !conditionResult) ? 'text-red-500' : 'text-red-500/50')}>
          ✗ False
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%' }} className="!bg-green-500" />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%' }} className="!bg-red-500" />
    </div>
  );
};

export default memo(ConditionalNode);

