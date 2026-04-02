import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Globe } from 'lucide-react';
import type { HttpRequestNodeData, ExecutionStatus } from '../../types/flow';
import { highlightVariables } from '../../utils/variableHighlight';
import clsx from 'clsx';

const methodColors: Record<string, string> = {
  GET: 'bg-blue-500',
  POST: 'bg-green-500',
  PUT: 'bg-yellow-500',
  PATCH: 'bg-orange-500',
  DELETE: 'bg-red-500',
  HEAD: 'bg-slate-500',
  OPTIONS: 'bg-slate-400',
};

interface HttpRequestNodeComponentProps extends NodeProps {
  data: HttpRequestNodeData & { status?: ExecutionStatus };
}

const HttpRequestNode: React.FC<HttpRequestNodeComponentProps> = ({ data, selected }) => {
  const status = data.status || 'idle';
  const headerCount = data.headers ? Object.keys(data.headers).length : 0;
  const paramCount = data.queryParams ? data.queryParams.filter((p: any) => p.enabled !== false && p.key).length : 0;

  return (
    <div
      className={clsx(
        'custom-node px-4 py-3 min-w-[250px]',
        {
          'border-blue-500': selected,
          'border-green-500': status === 'success',
          'border-red-500': status === 'error',
          'border-yellow-500': status === 'executing',
          'border-gray-300': status === 'idle' && !selected,
        }
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <Globe className="w-5 h-5 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={clsx(
                'px-2 py-0.5 rounded text-xs font-semibold text-white',
                methodColors[data.method] || 'bg-gray-500'
              )}
            >
              {data.method}
            </span>
            <span className="text-sm font-medium text-gray-900 truncate">
              {data.label}
            </span>
          </div>

          <div className="text-xs text-gray-600 font-mono truncate">
            {highlightVariables(data.path)}
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {paramCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-500">
                {paramCount} param{paramCount > 1 ? 's' : ''}
              </span>
            )}
            {headerCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                {headerCount} header{headerCount > 1 ? 's' : ''}
              </span>
            )}
            {data.body && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-500">
                body
              </span>
            )}
          </div>

          {status === 'executing' && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-yellow-600">Executing...</span>
            </div>
          )}

          {status === 'success' && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {(data as any)._responseStatus ? (
                <span className="text-xs text-green-600 font-mono">
                  {(data as any)._responseStatus}
                  {(data as any)._responseTime ? ` · ${(data as any)._responseTime}ms` : ''}
                </span>
              ) : (
                <span className="text-xs text-green-600">Success</span>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              {(data as any)._responseStatus ? (
                <span className="text-xs text-red-600 font-mono">
                  {(data as any)._responseStatus}
                  {(data as any)._responseTime ? ` · ${(data as any)._responseTime}ms` : ''}
                </span>
              ) : (
                <span className="text-xs text-red-600">Failed</span>
              )}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
    </div>
  );
};

export default memo(HttpRequestNode);
