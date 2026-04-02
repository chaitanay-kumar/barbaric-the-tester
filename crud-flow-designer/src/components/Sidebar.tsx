import React from 'react';
import {
  Play,
  Globe,
  Database,
  CheckCircle2,
  Clock,
  GitBranch,
  Repeat,
  Code,
  Layers,
} from 'lucide-react';

interface NodePaletteItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const nodeTypes: NodePaletteItem[] = [
  {
    type: 'start',
    label: 'Start',
    icon: <Play className="w-5 h-5" />,
    color: 'bg-blue-500',
    description: 'Flow entry point',
  },
  {
    type: 'http-request',
    label: 'HTTP Request',
    icon: <Globe className="w-5 h-5" />,
    color: 'bg-green-500',
    description: 'Make REST API call',
  },
  {
    type: 'variable-extractor',
    label: 'Extract Variable',
    icon: <Database className="w-5 h-5" />,
    color: 'bg-purple-500',
    description: 'Extract data from response',
  },
  {
    type: 'assertion',
    label: 'Assertion',
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: 'bg-green-600',
    description: 'Validate response',
  },
  {
    type: 'delay',
    label: 'Delay',
    icon: <Clock className="w-5 h-5" />,
    color: 'bg-yellow-500',
    description: 'Wait before next step',
  },
  {
    type: 'conditional',
    label: 'Conditional',
    icon: <GitBranch className="w-5 h-5" />,
    color: 'bg-orange-500',
    description: 'Branch based on condition',
  },
  {
    type: 'loop',
    label: 'Loop',
    icon: <Repeat className="w-5 h-5" />,
    color: 'bg-pink-500',
    description: 'Iterate over array',
  },
  {
    type: 'script',
    label: 'Script',
    icon: <Code className="w-5 h-5" />,
    color: 'bg-indigo-500',
    description: 'Custom JavaScript',
  },
  {
    type: 'parallel',
    label: 'Parallel',
    icon: <Layers className="w-5 h-5" />,
    color: 'bg-teal-500',
    description: 'Run requests in parallel',
  },
];

const Sidebar: React.FC<{ onCollapse?: () => void }> = ({ onCollapse }) => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-r border-blue-500/20 flex flex-col shadow-2xl">
      <div className="p-3 border-b border-blue-500/20 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Node Palette
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Drag to canvas</p>
        </div>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors text-xs"
            title="Collapse sidebar"
          >
            ◀
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {nodeTypes.map((node) => (
          <div
            key={node.type}
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
            className="group cursor-grab active:cursor-grabbing p-3 rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 hover:from-slate-700/80 hover:to-slate-800/80 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-10 h-10 ${node.color} rounded-lg flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110`}>
                {node.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-slate-200">{node.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{node.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-blue-500/20 bg-slate-950/50">
        <div className="text-xs text-slate-400">
          <p className="font-semibold mb-2 text-blue-400">Quick Tips:</p>
          <ul className="space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">→</span>
              <span>Drag nodes to canvas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">→</span>
              <span>Connect with handles</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">→</span>
              <span>Click to edit properties</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">→</span>
              <span>Delete with backspace</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

