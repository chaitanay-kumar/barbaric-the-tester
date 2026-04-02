import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFlowStore } from '../store/flowStore';
import type { Environment, EnvironmentVariable } from '../types/flow';

const EnvironmentManager: React.FC = () => {
  const environments = useFlowStore((s) => s.environments);
  const activeEnvironmentId = useFlowStore((s) => s.activeEnvironmentId);
  const setActiveEnvironment = useFlowStore((s) => s.setActiveEnvironment);
  const addEnvironment = useFlowStore((s) => s.addEnvironment);
  const updateEnvironment = useFlowStore((s) => s.updateEnvironment);
  const deleteEnvironment = useFlowStore((s) => s.deleteEnvironment);

  const [showPanel, setShowPanel] = useState(false);
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);

  const handleAddEnv = () => {
    const env: Environment = {
      id: `env-${Date.now()}`,
      name: 'New Environment',
      variables: [{ key: '', value: '', enabled: true }],
    };
    addEnvironment(env);
    setEditingEnvId(env.id);
  };

  const handleAddVariable = (envId: string) => {
    const env = environments.find((e) => e.id === envId);
    if (!env) return;
    updateEnvironment(envId, {
      variables: [...env.variables, { key: '', value: '', enabled: true }],
    });
  };

  const handleUpdateVariable = (envId: string, idx: number, updates: Partial<EnvironmentVariable>) => {
    const env = environments.find((e) => e.id === envId);
    if (!env) return;
    const newVars = env.variables.map((v, i) => (i === idx ? { ...v, ...updates } : v));
    updateEnvironment(envId, { variables: newVars });
  };

  const handleRemoveVariable = (envId: string, idx: number) => {
    const env = environments.find((e) => e.id === envId);
    if (!env) return;
    updateEnvironment(envId, { variables: env.variables.filter((_, i) => i !== idx) });
  };

  return (
    <>
      {/* Compact selector in toolbar */}
      <div className="relative flex items-center gap-1">
        <select
          value={activeEnvironmentId || ''}
          onChange={(e) => setActiveEnvironment(e.target.value || null)}
          className="px-2 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50 cursor-pointer"
          title="Active environment"
        >
          <option value="">No Environment</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>{env.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors text-xs"
          title="Manage environments"
        >
          ⚙
        </button>
      </div>

      {/* Environment manager panel */}
      {showPanel && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center"
          style={{ zIndex: 9999 }}
          onClick={() => setShowPanel(false)}
        >
          <div
            className="bg-slate-900 border border-blue-500/30 rounded-2xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-blue-400">Environments</h2>
                <p className="text-xs text-slate-500 mt-0.5">Define variables per environment (dev/staging/prod)</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddEnv}
                  className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
                >
                  + New Environment
                </button>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Environment list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {environments.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No environments yet. Click "+ New Environment" to create one.
                </div>
              )}

              {environments.map((env) => (
                <div
                  key={env.id}
                  className={`rounded-xl border transition-colors ${
                    env.id === activeEnvironmentId
                      ? 'border-blue-500/50 bg-blue-500/5'
                      : 'border-slate-700/50 bg-slate-800/30'
                  }`}
                >
                  {/* Env header */}
                  <div className="flex items-center justify-between p-3 border-b border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <input
                        value={env.name}
                        onChange={(e) => updateEnvironment(env.id, { name: e.target.value })}
                        className="bg-transparent text-sm font-semibold text-slate-200 border-none outline-none focus:ring-0"
                      />
                      {env.id === activeEnvironmentId && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Active</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {env.id !== activeEnvironmentId ? (
                        <button
                          onClick={() => setActiveEnvironment(env.id)}
                          className="text-xs px-2 py-1 rounded hover:bg-slate-700 text-slate-400 hover:text-green-400 transition-colors"
                        >
                          Set Active
                        </button>
                      ) : (
                        <button
                          onClick={() => setActiveEnvironment(null)}
                          className="text-xs px-2 py-1 rounded hover:bg-slate-700 text-slate-400 hover:text-yellow-400 transition-colors"
                        >
                          Deactivate
                        </button>
                      )}
                      <button
                        onClick={() => setEditingEnvId(editingEnvId === env.id ? null : env.id)}
                        className="text-xs px-2 py-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {editingEnvId === env.id ? 'Collapse' : 'Edit'}
                      </button>
                      <button
                        onClick={() => deleteEnvironment(env.id)}
                        className="text-xs px-2 py-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Variables table */}
                  {editingEnvId === env.id && (
                    <div className="p-3 space-y-2">
                      {/* Header row */}
                      <div className="grid grid-cols-[24px_1fr_1fr_32px] gap-2 text-xs text-slate-500 font-medium px-1">
                        <span></span>
                        <span>Key</span>
                        <span>Value</span>
                        <span></span>
                      </div>

                      {env.variables.map((v, idx) => (
                        <div key={idx} className="grid grid-cols-[24px_1fr_1fr_32px] gap-2 items-center">
                          <input
                            type="checkbox"
                            checked={v.enabled}
                            onChange={(e) => handleUpdateVariable(env.id, idx, { enabled: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-600 text-blue-500 focus:ring-blue-500/30 bg-slate-800"
                          />
                          <input
                            value={v.key}
                            onChange={(e) => handleUpdateVariable(env.id, idx, { key: e.target.value })}
                            placeholder="variable_name"
                            className="px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
                          />
                          <input
                            value={v.value}
                            onChange={(e) => handleUpdateVariable(env.id, idx, { value: e.target.value })}
                            placeholder="value"
                            className="px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
                          />
                          <button
                            onClick={() => handleRemoveVariable(env.id, idx)}
                            className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={() => handleAddVariable(env.id)}
                        className="w-full py-1.5 rounded border border-dashed border-slate-600 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 text-xs transition-colors"
                      >
                        + Add Variable
                      </button>
                    </div>
                  )}

                  {/* Collapsed variable summary */}
                  {editingEnvId !== env.id && env.variables.length > 0 && (
                    <div className="px-3 py-2 flex flex-wrap gap-1.5">
                      {env.variables.filter((v) => v.key).map((v, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                            v.enabled
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-slate-800/50 text-slate-600 line-through'
                          }`}
                        >
                          {v.key}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer tip */}
            <div className="p-3 border-t border-slate-800 text-xs text-slate-500">
              Use <code className="px-1 py-0.5 bg-slate-800 rounded text-blue-400">{'{{variableName}}'}</code> in any field to reference variables.
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default EnvironmentManager;


