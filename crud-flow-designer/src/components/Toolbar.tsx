import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Square,
  Save,
  Download,
  Upload,
  FileJson,
  FilePlus,
  Undo2,
  Redo2,
} from 'lucide-react';
import { useFlowStore } from '../store/flowStore';
import { getDemoCrudFlow } from '../constants/demoFlow';
import EnvironmentManager from './EnvironmentManager';
import RequestHistory from './RequestHistory';

const Toolbar: React.FC = () => {
  const {
    currentFlow,
    flows,
    isExecuting,
    saveFlow,
    exportFlow,
    importFlow,
    startExecution,
    stopExecution,
    createFlow,
    loadFlow,
    deleteFlow,
    updateFlowConfig,
    clearExecution,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useFlowStore();

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedJson, setExportedJson] = useState('');
  const [showFlowPicker, setShowFlowPicker] = useState(false);

  const handleExport = () => {
    const json = exportFlow();
    setExportedJson(json);
    setShowExportModal(true);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          importFlow(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleDownload = () => {
    const json = exportFlow();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFlow?.name || 'flow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRun = () => {
    if (isExecuting) {
      stopExecution();
    } else {
      startExecution();
    }
  };

  return (
    <>
      <div className="h-14 bg-gradient-to-r from-slate-900/95 via-blue-900/95 to-slate-900/95 backdrop-blur-xl border-b border-blue-500/20 flex items-center justify-between px-4 shadow-lg shadow-blue-500/10">
        {/* Left: Flow name + picker */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Flow picker */}
          <div className="relative">
            <button
              onClick={() => setShowFlowPicker(!showFlowPicker)}
              className="px-2 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-blue-500/50 transition-colors text-xs"
            >
              ▼ Flows ({flows.length})
            </button>
            {showFlowPicker && createPortal(
              <div
                className="fixed inset-0"
                onClick={() => setShowFlowPicker(false)}
              >
                <div
                  className="fixed top-14 left-4 w-64 bg-slate-900 border border-blue-500/30 rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
                  style={{ zIndex: 9999 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2 border-b border-slate-800 text-xs text-slate-400 font-medium">
                    Saved Flows
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {flows.length === 0 && (
                      <div className="p-3 text-xs text-slate-500 text-center">No saved flows yet</div>
                    )}
                    {flows.map((flow) => (
                      <div
                        key={flow.id}
                        className={`flex items-center justify-between px-3 py-2 hover:bg-slate-800/60 cursor-pointer transition-colors ${
                          flow.id === currentFlow?.id ? 'bg-blue-500/10 border-l-2 border-blue-400' : ''
                        }`}
                      >
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => { loadFlow(flow); setShowFlowPicker(false); }}
                        >
                          <div className="text-sm text-slate-200 truncate">{flow.name}</div>
                          <div className="text-xs text-slate-500">{flow.nodes.length} nodes</div>
                        </div>
                        {flows.length > 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteFlow(flow.id); }}
                            className="ml-2 p-1 text-slate-600 hover:text-red-400 transition-colors"
                            title="Delete flow"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-slate-800">
                    <button
                      onClick={() => { saveFlow(); setShowFlowPicker(false); }}
                      disabled={!currentFlow}
                      className="w-full px-2 py-1.5 text-xs text-blue-400 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30"
                    >
                      💾 Save current flow
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>

          <input
            value={currentFlow?.name || 'CRUD Flow Designer'}
            onChange={(e) => updateFlowConfig({ name: e.target.value })}
            className="text-lg font-bold bg-transparent text-blue-400 border-none outline-none focus:ring-0 w-52"
          />
          <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
            {currentFlow?.nodes.length || 0}n · {currentFlow?.edges.length || 0}e
          </span>
        </div>

        {/* Center: Environment selector + History */}
        <div className="flex items-center gap-2">
          <EnvironmentManager />
          <RequestHistory />
        </div>

        {/* Right: All actions */}
        <div className="flex items-center gap-1.5">
          {/* Flow management group */}
          <ToolbarBtn tip="New flow" onClick={() => { clearExecution(); createFlow('Untitled Flow'); }}>
            <FilePlus className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn tip="Load demo" onClick={() => { clearExecution(); loadFlow(getDemoCrudFlow()); }} className="text-emerald-400">
            <Play className="w-3 h-3" />
            <span className="text-xs">Demo</span>
          </ToolbarBtn>

          <div className="w-px h-6 bg-slate-700 mx-1" />

          {/* Run */}
          <button
            onClick={handleRun}
            disabled={!currentFlow}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
              isExecuting
                ? 'bg-red-500/90 hover:bg-red-600 text-white shadow-md shadow-red-500/40'
                : 'bg-emerald-500/90 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/40 disabled:bg-slate-700 disabled:shadow-none disabled:cursor-not-allowed'
            }`}
          >
            {isExecuting ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            {isExecuting ? 'Stop' : 'Run'}
          </button>

          <div className="w-px h-6 bg-slate-700 mx-1" />

          {/* Undo/Redo */}
          <ToolbarBtn tip="Undo (⌘Z)" onClick={undo} disabled={!canUndo}>
            <Undo2 className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn tip="Redo (⌘⇧Z)" onClick={redo} disabled={!canRedo}>
            <Redo2 className="w-4 h-4" />
          </ToolbarBtn>

          <div className="w-px h-6 bg-slate-700 mx-1" />

          {/* File operations */}
          <ToolbarBtn tip="Save" onClick={saveFlow} disabled={!currentFlow} className="text-blue-400">
            <Save className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn tip="Export JSON" onClick={handleExport} disabled={!currentFlow} className="text-purple-400">
            <FileJson className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn tip="Download" onClick={handleDownload} disabled={!currentFlow} className="text-cyan-400">
            <Download className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn tip="Import" onClick={handleImport} className="text-amber-400">
            <Upload className="w-4 h-4" />
          </ToolbarBtn>
        </div>
      </div>

      {/* Export Modal - Futuristic */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl shadow-blue-500/20 border border-blue-500/30 max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-blue-500/20 flex items-center justify-between">
              <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Exported Flow JSON
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs bg-slate-950/50 text-emerald-400 p-4 rounded-xl border border-emerald-500/20 overflow-auto font-mono">
                {exportedJson}
              </pre>
            </div>
            <div className="p-4 border-t border-blue-500/20 flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportedJson);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/50 transition-all"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-slate-500/50 bg-slate-800/50 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Toolbar;

// Toolbar button with instant tooltip
const ToolbarBtn: React.FC<{
  tip: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ tip, onClick, disabled, className = '', children }) => {
  const [show, setShow] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const btnRef = React.useRef<HTMLButtonElement>(null);

  const onEnter = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 6 });
    }
    setShow(true);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={onEnter}
        onMouseLeave={() => setShow(false)}
        className={`flex items-center gap-1 p-2 rounded-lg hover:bg-slate-800/60 hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${className}`}
      >
        {children}
      </button>
      {show && createPortal(
        <div
          className="fixed px-2 py-1 rounded bg-slate-700 text-white text-xs whitespace-nowrap pointer-events-none shadow-lg"
          style={{ left: pos.x, top: pos.y, transform: 'translateX(-50%)', zIndex: 9999 }}
        >
          {tip}
        </div>,
        document.body
      )}
    </>
  );
};

