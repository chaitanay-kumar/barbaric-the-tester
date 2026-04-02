import React from 'react';
import { useFlowStore } from '../store/flowStore';
import { X, Trash2, Copy, Unlink } from 'lucide-react';
import VariableInput from './VariableInput';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const AUTH_TYPES = ['none', 'bearer', 'basic', 'api-key'];

const NodePropertyEditor: React.FC = () => {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const currentFlow = useFlowStore((s) => s.currentFlow);
  const updateNode = useFlowStore((s) => s.updateNode);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  const selectNode = useFlowStore((s) => s.selectNode);
  const duplicateNode = useFlowStore((s) => s.duplicateNode);
  const updateFlowConfig = useFlowStore((s) => s.updateFlowConfig);

  if (!selectedNodeId || !currentFlow) return null;

  const node = currentFlow.nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const { data, type } = node;

  // Count connections
  const incomingEdges = currentFlow.edges.filter((e) => e.target === selectedNodeId).length;
  const outgoingEdges = currentFlow.edges.filter((e) => e.source === selectedNodeId).length;
  const totalConnections = incomingEdges + outgoingEdges;

  const update = (field: string, value: any) => {
    updateNode(selectedNodeId, { [field]: value });
  };

  const handleDelete = () => {
    deleteNode(selectedNodeId);
    selectNode(null);
  };

  const handleDisconnect = () => {
    updateFlowConfig({
      edges: currentFlow.edges.filter(
        (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
      ),
    });
  };

  return (
    <div className="w-full h-full bg-slate-900/95 border-l border-blue-500/20 flex flex-col text-sm overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-blue-500/20 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-blue-400">Node Properties</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {type} · {incomingEdges}↓ {outgoingEdges}↑
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => duplicateNode(selectedNodeId)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
            title="Duplicate node (Ctrl+D)"
          >
            <Copy className="w-4 h-4" />
          </button>
          {totalConnections > 0 && (
            <button
              onClick={handleDisconnect}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
              title={`Disconnect all (${totalConnections} connections)`}
            >
              <Unlink className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
            title="Delete node"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => selectNode(null)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Label — all node types */}
        <Field label="Label">
          <input
            value={data.label || ''}
            onChange={(e) => update('label', e.target.value)}
            className="input-field"
          />
        </Field>

        {/* Start Node */}
        {type === 'start' && (
          <>
            <Field label="Base URL">
              <VariableInput
                value={data.baseUrl || ''}
                onChange={(v) => update('baseUrl', v)}
                placeholder="https://api.example.com or {{baseUrl}}"
              />
            </Field>
            <Field label="Auth Type">
              <select
                value={data.auth?.type || 'none'}
                onChange={(e) => update('auth', { ...data.auth, type: e.target.value })}
                className="input-field"
              >
                {AUTH_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            {data.auth?.type === 'bearer' && (
              <Field label="Token">
                <VariableInput
                  value={data.auth?.token || ''}
                  onChange={(v) => update('auth', { ...data.auth, token: v })}
                  placeholder="Bearer token or {{token}}"
                />
              </Field>
            )}
            {data.auth?.type === 'basic' && (
              <>
                <Field label="Username">
                  <VariableInput
                    value={data.auth?.username || ''}
                    onChange={(v) => update('auth', { ...data.auth, username: v })}
                    placeholder="Username or {{user}}"
                  />
                </Field>
                <Field label="Password">
                  <VariableInput
                    value={data.auth?.password || ''}
                    onChange={(v) => update('auth', { ...data.auth, password: v })}
                    placeholder="Password or {{pass}}"
                  />
                </Field>
              </>
            )}
            {data.auth?.type === 'api-key' && (
              <>
                <Field label="API Key Header">
                  <input
                    value={data.auth?.apiKeyHeader || ''}
                    onChange={(e) => update('auth', { ...data.auth, apiKeyHeader: e.target.value })}
                    placeholder="X-API-Key"
                    className="input-field"
                  />
                </Field>
                <Field label="API Key">
                  <input
                    value={data.auth?.apiKey || ''}
                    onChange={(e) => update('auth', { ...data.auth, apiKey: e.target.value })}
                    placeholder="your-api-key"
                    className="input-field"
                  />
                </Field>
              </>
            )}

            {/* Global Headers */}
            <Field label="Global Headers (JSON)">
              <textarea
                value={data.headers ? JSON.stringify(data.headers, null, 2) : '{}'}
                onChange={(e) => {
                  try {
                    update('headers', JSON.parse(e.target.value));
                  } catch { /* ignore parse errors while typing */ }
                }}
                rows={3}
                placeholder='{"Content-Type": "application/json"}'
                className="input-field font-mono text-xs"
              />
            </Field>

            {/* Global Timeout */}
            <Field label="Default Timeout (ms)">
              <input
                type="number"
                value={data.globalTimeout ?? 30000}
                onChange={(e) => update('globalTimeout', parseInt(e.target.value) || 30000)}
                min={1000}
                step={1000}
                className="input-field"
              />
            </Field>

            {/* Global Retries */}
            <Field label="Default Retries">
              <input
                type="number"
                value={data.globalRetries ?? 0}
                onChange={(e) => update('globalRetries', parseInt(e.target.value) || 0)}
                min={0}
                max={5}
                className="input-field"
              />
            </Field>
          </>
        )}

        {/* HTTP Request Node */}
        {type === 'http-request' && (
          <>
            <Field label="Description">
              <input
                value={data.description || ''}
                onChange={(e) => update('description', e.target.value)}
                placeholder="What does this request do?"
                className="input-field text-xs"
              />
            </Field>
            <Field label="Method">
              <select
                value={data.method || 'GET'}
                onChange={(e) => update('method', e.target.value)}
                className="input-field"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Path">
              <VariableInput
                value={data.path || ''}
                onChange={(v) => update('path', v)}
                placeholder="/endpoint/{{id}}"
              />
            </Field>

            {/* Query Params */}
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1.5">Query Params</p>
              {(data.queryParams || []).map((p: any, i: number) => (
                <div key={i} className="grid grid-cols-[20px_1fr_1fr_20px] gap-1.5 mb-1.5 items-center">
                  <input
                    type="checkbox"
                    checked={p.enabled !== false}
                    onChange={(e) => {
                      const params = [...(data.queryParams || [])];
                      params[i] = { ...p, enabled: e.target.checked };
                      update('queryParams', params);
                    }}
                    className="w-3.5 h-3.5 rounded border-slate-600 text-blue-500 bg-slate-800"
                  />
                  <input
                    value={p.key || ''}
                    onChange={(e) => {
                      const params = [...(data.queryParams || [])];
                      params[i] = { ...p, key: e.target.value };
                      update('queryParams', params);
                    }}
                    placeholder="key"
                    className="input-field font-mono text-xs"
                  />
                  <input
                    value={p.value || ''}
                    onChange={(e) => {
                      const params = [...(data.queryParams || [])];
                      params[i] = { ...p, value: e.target.value };
                      update('queryParams', params);
                    }}
                    placeholder="value"
                    className="input-field font-mono text-xs"
                  />
                  <button
                    onClick={() => {
                      const params = (data.queryParams || []).filter((_: any, j: number) => j !== i);
                      update('queryParams', params);
                    }}
                    className="text-slate-500 hover:text-red-400 text-xs transition-colors"
                  >✕</button>
                </div>
              ))}
              <button
                onClick={() => update('queryParams', [...(data.queryParams || []), { key: '', value: '', enabled: true }])}
                className="w-full py-1 rounded border border-dashed border-slate-600 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 text-xs transition-colors"
              >
                + Add Param
              </button>
            </div>

            <Field label="Headers (JSON)">
              <textarea
                value={typeof data.headers === 'object' ? JSON.stringify(data.headers, null, 2) : data.headers || ''}
                onChange={(e) => {
                  try { update('headers', JSON.parse(e.target.value)); } catch { /* let user keep typing */ }
                }}
                rows={3}
                placeholder='{"Content-Type": "application/json"}'
                className="input-field font-mono text-xs"
              />
            </Field>
            {data.method !== 'GET' && data.method !== 'HEAD' && (
              <>
                <Field label="Body Type">
                  <select
                    value={data.bodyType || 'json'}
                    onChange={(e) => update('bodyType', e.target.value)}
                    className="input-field"
                  >
                    <option value="json">JSON</option>
                    <option value="form-urlencoded">x-www-form-urlencoded</option>
                    <option value="form-data">multipart/form-data</option>
                    <option value="raw">Raw (text/XML)</option>
                    <option value="none">No Body</option>
                  </select>
                </Field>

                {/* JSON / Raw body editor */}
                {(data.bodyType === 'json' || data.bodyType === 'raw' || !data.bodyType) && (
                  <Field label={data.bodyType === 'raw' ? 'Body (Raw)' : 'Body (JSON)'}>
                    <VariableInput
                      value={typeof data.body === 'string' ? data.body : JSON.stringify(data.body, null, 2) || ''}
                      onChange={(v) => update('body', v)}
                      placeholder={data.bodyType === 'raw' ? 'Raw body content...' : '{"key": "value"}'}
                      multiline
                      rows={6}
                    />
                  </Field>
                )}

                {/* Form-data / URL-encoded editor */}
                {(data.bodyType === 'form-urlencoded' || data.bodyType === 'form-data') && (
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-1.5">
                      {data.bodyType === 'form-data' ? 'Form Data' : 'Form Fields'}
                    </p>
                    {(data.formData || []).map((entry: any, i: number) => (
                      <div key={i} className="grid grid-cols-[20px_1fr_1fr_20px] gap-1.5 mb-1.5 items-center">
                        <input
                          type="checkbox"
                          checked={entry.enabled !== false}
                          onChange={(e) => {
                            const fd = [...(data.formData || [])];
                            fd[i] = { ...entry, enabled: e.target.checked };
                            update('formData', fd);
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-600 text-blue-500 bg-slate-800"
                        />
                        <input
                          value={entry.key || ''}
                          onChange={(e) => {
                            const fd = [...(data.formData || [])];
                            fd[i] = { ...entry, key: e.target.value };
                            update('formData', fd);
                          }}
                          placeholder="key"
                          className="input-field font-mono text-xs"
                        />
                        <VariableInput
                          value={entry.value || ''}
                          onChange={(v) => {
                            const fd = [...(data.formData || [])];
                            fd[i] = { ...entry, value: v };
                            update('formData', fd);
                          }}
                          placeholder="value or {{var}}"
                        />
                        <button
                          onClick={() => {
                            const fd = (data.formData || []).filter((_: any, j: number) => j !== i);
                            update('formData', fd);
                          }}
                          className="text-slate-500 hover:text-red-400 text-xs transition-colors"
                        >✕</button>
                      </div>
                    ))}
                    <button
                      onClick={() => update('formData', [...(data.formData || []), { key: '', value: '', type: 'text', enabled: true }])}
                      className="w-full py-1 rounded border border-dashed border-slate-600 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 text-xs transition-colors"
                    >
                      + Add Field
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Per-Node Timeout & Retry */}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Timeout (ms)">
                <input
                  type="number"
                  value={data.timeout || ''}
                  onChange={(e) => update('timeout', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="30000"
                  min={100}
                  className="input-field text-xs"
                />
              </Field>
              <Field label="Max Retries">
                <input
                  type="number"
                  value={data.maxRetries ?? ''}
                  onChange={(e) => update('maxRetries', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="1"
                  min={0}
                  max={5}
                  className="input-field text-xs"
                />
              </Field>
            </div>

            {/* Per-Request Auth Override */}
            <div className="border-t border-slate-800 pt-3 mt-1">
              <Field label="Auth Override">
                <select
                  value={data.authOverride?.type || 'inherit'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'inherit') {
                      update('authOverride', undefined);
                    } else {
                      update('authOverride', { ...data.authOverride, type: val });
                    }
                  }}
                  className="input-field"
                >
                  <option value="inherit">↑ Inherit from Start</option>
                  <option value="none">No Auth</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                  <option value="api-key">API Key</option>
                </select>
              </Field>
              {data.authOverride?.type === 'bearer' && (
                <Field label="Token">
                  <VariableInput
                    value={data.authOverride?.token || ''}
                    onChange={(v) => update('authOverride', { ...data.authOverride, token: v })}
                    placeholder="Bearer token or {{token}}"
                  />
                </Field>
              )}
              {data.authOverride?.type === 'basic' && (
                <>
                  <Field label="Username">
                    <VariableInput
                      value={data.authOverride?.username || ''}
                      onChange={(v) => update('authOverride', { ...data.authOverride, username: v })}
                      placeholder="username or {{user}}"
                    />
                  </Field>
                  <Field label="Password">
                    <VariableInput
                      value={data.authOverride?.password || ''}
                      onChange={(v) => update('authOverride', { ...data.authOverride, password: v })}
                      placeholder="password or {{pass}}"
                    />
                  </Field>
                </>
              )}
              {data.authOverride?.type === 'api-key' && (
                <>
                  <Field label="Header Name">
                    <input
                      value={data.authOverride?.apiKeyHeader || ''}
                      onChange={(e) => update('authOverride', { ...data.authOverride, apiKeyHeader: e.target.value })}
                      placeholder="X-API-Key"
                      className="input-field font-mono text-xs"
                    />
                  </Field>
                  <Field label="Key Value">
                    <VariableInput
                      value={data.authOverride?.apiKey || ''}
                      onChange={(v) => update('authOverride', { ...data.authOverride, apiKey: v })}
                      placeholder="your-api-key or {{apiKey}}"
                    />
                  </Field>
                </>
              )}
            </div>
          </>
        )}

        {/* Variable Extractor Node */}
        {type === 'variable-extractor' && (
          <>
            <Field label="JSON Path">
              <input
                value={data.jsonPath || ''}
                onChange={(e) => update('jsonPath', e.target.value)}
                placeholder="$.data.id"
                className="input-field font-mono"
              />
            </Field>
            <Field label="Variable Name">
              <input
                value={data.variableName || ''}
                onChange={(e) => update('variableName', e.target.value)}
                placeholder="myVar"
                className="input-field font-mono"
              />
            </Field>
            <Field label="Source">
              <select
                value={data.source || 'body'}
                onChange={(e) => update('source', e.target.value)}
                className="input-field"
              >
                <option value="body">Response Body</option>
                <option value="headers">Response Headers</option>
                <option value="status">Status Code</option>
              </select>
            </Field>
            <Field label="Default Value">
              <input
                value={data.defaultValue || ''}
                onChange={(e) => update('defaultValue', e.target.value)}
                placeholder="Fallback if not found"
                className="input-field text-xs"
              />
            </Field>
            <Field label="Transform">
              <select
                value={data.transform || 'none'}
                onChange={(e) => update('transform', e.target.value)}
                className="input-field"
              >
                <option value="none">None</option>
                <option value="toString">To String</option>
                <option value="toNumber">To Number</option>
                <option value="toBoolean">To Boolean</option>
                <option value="trim">Trim</option>
              </select>
            </Field>
          </>
        )}

        {/* Assertion Node */}
        {type === 'assertion' && (
          <>
            <p className="text-xs text-slate-400 font-medium">Assertions</p>
            {(data.assertions || []).map((a: any, i: number) => (
              <div key={i} className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">#{i + 1}</span>
                  <button
                    onClick={() => {
                      const newAssertions = [...data.assertions];
                      newAssertions.splice(i, 1);
                      update('assertions', newAssertions);
                    }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >Remove</button>
                </div>
                <select
                  value={a.type}
                  onChange={(e) => {
                    const newAssertions = [...data.assertions];
                    newAssertions[i] = { ...a, type: e.target.value };
                    update('assertions', newAssertions);
                  }}
                  className="input-field"
                >
                  <option value="status_code">Status Code</option>
                  <option value="jsonpath_exists">JSONPath Exists</option>
                  <option value="jsonpath_equals">JSONPath Equals</option>
                  <option value="jsonpath_not_equals">JSONPath Not Equals</option>
                  <option value="response_time">Response Time (ms)</option>
                  <option value="contains">Body Contains</option>
                  <option value="not_contains">Body Not Contains</option>
                  <option value="regex">Body Matches Regex</option>
                  <option value="header_equals">Header Equals</option>
                  <option value="header_exists">Header Exists</option>
                </select>
                {a.type === 'status_code' && (
                  <input
                    type="number"
                    value={a.expected || ''}
                    onChange={(e) => {
                      const newAssertions = [...data.assertions];
                      newAssertions[i] = { ...a, expected: parseInt(e.target.value) };
                      update('assertions', newAssertions);
                    }}
                    placeholder="200"
                    className="input-field"
                  />
                )}
                {a.type === 'response_time' && (
                  <input
                    type="number"
                    value={a.expected || ''}
                    onChange={(e) => {
                      const newAssertions = [...data.assertions];
                      newAssertions[i] = { ...a, expected: parseInt(e.target.value) };
                      update('assertions', newAssertions);
                    }}
                    placeholder="Max ms (e.g. 500)"
                    className="input-field"
                  />
                )}
                {(a.type === 'contains' || a.type === 'not_contains' || a.type === 'regex') && (
                  <input
                    value={a.expected || ''}
                    onChange={(e) => {
                      const newAssertions = [...data.assertions];
                      newAssertions[i] = { ...a, expected: e.target.value };
                      update('assertions', newAssertions);
                    }}
                    placeholder={a.type === 'regex' ? 'Regex pattern (e.g. "id":\\d+)' : 'Text to find in body'}
                    className="input-field font-mono text-xs"
                  />
                )}
                {(a.type === 'header_equals' || a.type === 'header_exists') && (
                  <>
                    <input
                      value={a.expression || ''}
                      onChange={(e) => {
                        const newAssertions = [...data.assertions];
                        newAssertions[i] = { ...a, expression: e.target.value };
                        update('assertions', newAssertions);
                      }}
                      placeholder="Header name (e.g. content-type)"
                      className="input-field font-mono text-xs"
                    />
                    {a.type === 'header_equals' && (
                      <input
                        value={a.expected || ''}
                        onChange={(e) => {
                          const newAssertions = [...data.assertions];
                          newAssertions[i] = { ...a, expected: e.target.value };
                          update('assertions', newAssertions);
                        }}
                        placeholder="Expected value"
                        className="input-field font-mono text-xs"
                      />
                    )}
                  </>
                )}
                {(a.type === 'jsonpath_exists' || a.type === 'jsonpath_equals' || a.type === 'jsonpath_not_equals') && (
                  <input
                    value={a.expression || ''}
                    onChange={(e) => {
                      const newAssertions = [...data.assertions];
                      newAssertions[i] = { ...a, expression: e.target.value };
                      update('assertions', newAssertions);
                    }}
                    placeholder="$.data.id"
                    className="input-field font-mono"
                  />
                )}
                {a.type === 'jsonpath_equals' && (
                  <input
                    value={a.expected || ''}
                    onChange={(e) => {
                      const newAssertions = [...data.assertions];
                      newAssertions[i] = { ...a, expected: e.target.value };
                      update('assertions', newAssertions);
                    }}
                    placeholder="expected value"
                    className="input-field"
                  />
                )}
                {a.type === 'jsonpath_not_equals' && (
                  <input
                    value={a.expected || ''}
                    onChange={(e) => {
                      const newAssertions = [...data.assertions];
                      newAssertions[i] = { ...a, expected: e.target.value };
                      update('assertions', newAssertions);
                    }}
                    placeholder="value that should NOT match"
                    className="input-field"
                  />
                )}
              </div>
            ))}
            <button
              onClick={() => update('assertions', [...(data.assertions || []), { type: 'status_code', expected: 200 }])}
              className="w-full py-1.5 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 text-xs transition-colors"
            >
              + Add Assertion
            </button>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={data.stopOnFirstFailure ?? false}
                onChange={(e) => update('stopOnFirstFailure', e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-600 text-blue-500 bg-slate-800"
              />
              <span className="text-xs text-slate-400">Stop on first failure</span>
            </div>
          </>
        )}

        {/* Delay Node */}
        {type === 'delay' && (
          <>
            <Field label="Delay Type">
              <select
                value={data.delayType || 'fixed'}
                onChange={(e) => update('delayType', e.target.value)}
                className="input-field"
              >
                <option value="fixed">Fixed</option>
                <option value="random">Random Range</option>
                <option value="variable">From Variable</option>
              </select>
            </Field>
            {(data.delayType || 'fixed') === 'fixed' && (
              <Field label="Delay (ms)">
                <input
                  type="number"
                  value={data.milliseconds || 1000}
                  onChange={(e) => update('milliseconds', parseInt(e.target.value))}
                  min={0}
                  className="input-field"
                />
              </Field>
            )}
            {data.delayType === 'random' && (
              <>
                <Field label="Min (ms)">
                  <input
                    type="number"
                    value={data.minMs ?? 500}
                    onChange={(e) => update('minMs', parseInt(e.target.value))}
                    min={0}
                    className="input-field"
                  />
                </Field>
                <Field label="Max (ms)">
                  <input
                    type="number"
                    value={data.maxMs ?? 2000}
                    onChange={(e) => update('maxMs', parseInt(e.target.value))}
                    min={0}
                    className="input-field"
                  />
                </Field>
              </>
            )}
            {data.delayType === 'variable' && (
              <Field label="Variable Name">
                <input
                  value={data.variableName || ''}
                  onChange={(e) => update('variableName', e.target.value)}
                  placeholder="delayMs"
                  className="input-field font-mono"
                />
              </Field>
            )}
          </>
        )}

        {/* Conditional Node */}
        {type === 'conditional' && (
          <>
            <Field label="Condition Source">
              <select
                value={data.conditionSource || 'jsonpath'}
                onChange={(e) => update('conditionSource', e.target.value)}
                className="input-field"
              >
                <option value="status_code">Status Code</option>
                <option value="jsonpath">JSONPath (Response)</option>
                <option value="variable">Variable</option>
              </select>
            </Field>
            {(data.conditionSource || 'jsonpath') === 'jsonpath' && (
              <Field label="JSONPath Expression">
                <input
                  value={data.condition || ''}
                  onChange={(e) => update('condition', e.target.value)}
                  placeholder="$.data.status"
                  className="input-field font-mono"
                />
              </Field>
            )}
            {data.conditionSource === 'variable' && (
              <Field label="Variable Name">
                <input
                  value={data.condition || ''}
                  onChange={(e) => update('condition', e.target.value)}
                  placeholder="myVariable"
                  className="input-field font-mono"
                />
              </Field>
            )}
            <Field label="Operator">
              <select
                value={data.operator || '=='}
                onChange={(e) => update('operator', e.target.value)}
                className="input-field"
              >
                {['==', '!=', '>', '<', '>=', '<=', 'contains', 'not_contains', 'exists', 'not_exists'].map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </Field>
            {!['exists', 'not_exists'].includes(data.operator || '') && (
              <Field label="Value">
                <VariableInput
                  value={data.value || ''}
                  onChange={(v) => update('value', v)}
                  placeholder="Expected value or {{variable}}"
                />
              </Field>
            )}
          </>
        )}

        {/* Loop Node */}
        {type === 'loop' && (
          <>
            <Field label="Data Source">
              <select
                value={data.dataSource || 'response'}
                onChange={(e) => update('dataSource', e.target.value)}
                className="input-field"
              >
                <option value="response">Previous Response</option>
                <option value="inline">Inline JSON Array</option>
                <option value="variable">Variable</option>
              </select>
            </Field>
            {(data.dataSource || 'response') === 'response' && (
              <Field label="Array Path (JSONPath)">
                <input
                  value={data.arrayPath || ''}
                  onChange={(e) => update('arrayPath', e.target.value)}
                  placeholder="$.data.items"
                  className="input-field font-mono"
                />
              </Field>
            )}
            {data.dataSource === 'inline' && (
              <Field label="Inline Data (JSON Array)">
                <textarea
                  value={data.inlineData || ''}
                  onChange={(e) => update('inlineData', e.target.value)}
                  rows={4}
                  placeholder='[{"id": 1}, {"id": 2}, {"id": 3}]'
                  className="input-field font-mono text-xs"
                />
              </Field>
            )}
            {data.dataSource === 'variable' && (
              <Field label="Variable Name">
                <input
                  value={data.dataVariable || ''}
                  onChange={(e) => update('dataVariable', e.target.value)}
                  placeholder="myArray"
                  className="input-field font-mono"
                />
              </Field>
            )}
            <Field label="Item Variable Name">
              <input
                value={data.itemVariable || '_currentItem'}
                onChange={(e) => update('itemVariable', e.target.value)}
                placeholder="_currentItem"
                className="input-field font-mono"
              />
              <p className="text-xs text-slate-500 mt-0.5">Access via {`{{${data.itemVariable || '_currentItem'}}}`}</p>
            </Field>
            <Field label="Max Iterations">
              <input
                type="number"
                value={data.maxIterations || 100}
                onChange={(e) => update('maxIterations', parseInt(e.target.value))}
                min={1}
                className="input-field"
              />
            </Field>
          </>
        )}

        {/* Script Node */}
        {type === 'script' && (
          <>
            <Field label="Description">
              <input
                value={data.description || ''}
                onChange={(e) => update('description', e.target.value)}
                placeholder="What does this script do?"
                className="input-field text-xs"
              />
            </Field>
            <Field label="Script">
              <textarea
                value={data.script || ''}
                onChange={(e) => update('script', e.target.value)}
                rows={10}
                placeholder="// JavaScript code"
                className="input-field font-mono text-xs"
              />
            </Field>
            <div className="p-2 rounded-lg bg-slate-800/30 border border-slate-700/30">
              <p className="text-xs text-slate-500 font-medium mb-1">Available API:</p>
              <div className="text-xs text-slate-500 font-mono space-y-0.5">
                <div><span className="text-blue-400">variables</span> — all flow variables</div>
                <div><span className="text-blue-400">response</span> — last HTTP response (.body, .statusCode, .headers)</div>
                <div><span className="text-blue-400">request</span> — last HTTP request</div>
                <div><span className="text-green-400">setVariable</span>(key, value) — set a variable</div>
                <div><span className="text-green-400">console.log</span>(...) — log output</div>
              </div>
            </div>
          </>
        )}

        {/* Parallel Node */}
        {type === 'parallel' && (
          <>
            <Field label="Max Concurrent">
              <input
                type="number"
                value={data.maxConcurrent || 5}
                onChange={(e) => update('maxConcurrent', parseInt(e.target.value))}
                min={1}
                max={20}
                className="input-field"
              />
            </Field>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.failFast ?? false}
                onChange={(e) => update('failFast', e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-600 text-blue-500 bg-slate-800"
              />
              <span className="text-xs text-slate-400">Fail fast (stop all branches if one fails)</span>
            </div>
          </>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="p-2 border-t border-slate-800 text-xs text-slate-600 flex gap-3 flex-wrap">
        <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400">⌘D</kbd> Duplicate</span>
        <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400">⌫</kbd> Delete</span>
        <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400">⌘Z</kbd> Undo</span>
        <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400">Esc</kbd> Close</span>
      </div>
    </div>
  );
};

// Reusable field wrapper
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
    {children}
  </div>
);

export default NodePropertyEditor;

