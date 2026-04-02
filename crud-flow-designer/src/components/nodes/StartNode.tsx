import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Play, Shield, Clock, RotateCcw } from 'lucide-react';
import type { StartNodeData } from '../../types/flow';
import { highlightVariables } from '../../utils/variableHighlight';

interface StartNodeComponentProps extends NodeProps {
  data: StartNodeData;
}

const StartNode: React.FC<StartNodeComponentProps> = ({ data, selected }) => {
  const headerCount = data.headers ? Object.keys(data.headers).filter(k => k).length : 0;

  return (
    <div
      className={`custom-node px-4 py-3 min-w-[220px] bg-gradient-to-r from-blue-50 to-blue-100 ${
        selected ? 'border-blue-500' : 'border-blue-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-blue-900 mb-1">Start</div>
          <div className="text-xs text-blue-700 font-mono truncate">{highlightVariables(data.baseUrl)}</div>

          {/* Badges row */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {data.auth && data.auth.type !== 'none' && (
              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-200/60 text-blue-700">
                <Shield className="w-3 h-3" />
                {data.auth.type}
              </span>
            )}
            {headerCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-600">
                {headerCount} hdr{headerCount > 1 ? 's' : ''}
              </span>
            )}
            {data.globalTimeout && data.globalTimeout !== 30000 && (
              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
                <Clock className="w-3 h-3" />
                {data.globalTimeout / 1000}s
              </span>
            )}
            {(data.globalRetries ?? 0) > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                <RotateCcw className="w-3 h-3" />
                {data.globalRetries}×
              </span>
            )}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
};

export default memo(StartNode);
