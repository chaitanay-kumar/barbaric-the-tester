import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Code } from 'lucide-react';
import clsx from 'clsx';

const ScriptNode: React.FC<NodeProps> = ({ data, selected }) => {
  const status = data.status || 'idle';
  // Show first non-comment, non-empty line as preview
  const scriptLines = (data.script || '').split('\n').filter((l: string) => l.trim() && !l.trim().startsWith('//'));
  const preview = scriptLines[0]?.trim().slice(0, 40) || 'Empty script';
  const lineCount = (data.script || '').split('\n').filter((l: string) => l.trim()).length;
  const logCount = data._scriptLogCount;

  return (
    <div
      className={clsx(
        'custom-node px-4 py-3 min-w-[220px] bg-gradient-to-r from-indigo-50 to-indigo-100',
        {
          'border-blue-500': selected,
          'border-green-500': status === 'success',
          'border-red-500': status === 'error',
          'border-yellow-500': status === 'executing',
          'border-indigo-300': status === 'idle' && !selected,
        }
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-500" />

      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
            <Code className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-indigo-900 mb-1">{data.label || 'Script'}</div>
          {data.description && (
            <div className="text-xs text-indigo-600 mb-0.5 truncate">{data.description}</div>
          )}
          <div className="text-xs text-indigo-700 font-mono truncate">{preview}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-indigo-400">{lineCount} line{lineCount !== 1 ? 's' : ''}</span>
          </div>
          {status === 'executing' && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-xs text-yellow-600">Running...</span>
            </div>
          )}
          {status === 'success' && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-green-600">
                Done{logCount ? ` · ${logCount} log${logCount !== 1 ? 's' : ''}` : ''}
              </span>
            </div>
          )}
          {status === 'error' && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-xs text-red-600">Error</span>
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500" />
    </div>
  );
};

export default memo(ScriptNode);

