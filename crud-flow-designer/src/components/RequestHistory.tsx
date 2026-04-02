import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { getHistory, clearHistory, type HistoryEntry } from '../services/requestHistory';
import { History, Trash2, X, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-400',
  POST: 'text-blue-400',
  PUT: 'text-amber-400',
  PATCH: 'text-orange-400',
  DELETE: 'text-red-400',
  HEAD: 'text-slate-400',
  OPTIONS: 'text-purple-400',
};

const RequestHistory: React.FC = () => {
  const [showPanel, setShowPanel] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openPanel = () => {
    setHistory(getHistory());
    setShowPanel(true);
  };

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  const copyAsCurl = (entry: HistoryEntry) => {
    const parts = [`curl -X ${entry.method}`, `  '${entry.url}'`];
    if (entry.request.headers) {
      Object.entries(entry.request.headers).forEach(([k, v]) => {
        parts.push(`  -H '${k}: ${v}'`);
      });
    }
    if (entry.request.body) {
      const bodyStr = typeof entry.request.body === 'string' ? entry.request.body : JSON.stringify(entry.request.body);
      parts.push(`  -d '${bodyStr}'`);
    }
    navigator.clipboard.writeText(parts.join(' \\\n'));
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <button
        onClick={openPanel}
        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
        title="Request History"
      >
        <History className="w-4 h-4" />
      </button>

      {showPanel && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center"
          style={{ zIndex: 9999 }}
          onClick={() => setShowPanel(false)}
        >
          <div
            className="bg-slate-900 border border-blue-500/30 rounded-2xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Request History
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{history.length} requests logged</p>
              </div>
              <div className="flex gap-2">
                {history.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="px-3 py-1.5 rounded-lg hover:bg-red-500/10 text-red-400 text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* History list */}
            <div className="flex-1 overflow-y-auto">
              {history.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No requests yet. Run a flow to see history here.
                </div>
              )}

              {history.map((entry) => {
                const isExpanded = expandedId === entry.id;
                return (
                  <div key={entry.id} className="border-b border-slate-800/50">
                    {/* Summary row */}
                    <div
                      className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-slate-800/30 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                      <span className={`text-xs font-mono font-bold w-14 shrink-0 ${METHOD_COLORS[entry.method] || 'text-slate-400'}`}>
                        {entry.method}
                      </span>
                      <span className="text-xs font-mono text-slate-300 truncate flex-1">
                        {entry.url}
                      </span>
                      {entry.statusCode && (
                        <span className={`text-xs font-mono font-bold shrink-0 ${
                          entry.statusCode >= 200 && entry.statusCode < 300 ? 'text-green-400'
                          : entry.statusCode >= 400 ? 'text-red-400'
                          : 'text-yellow-400'
                        }`}>
                          {entry.statusCode}
                        </span>
                      )}
                      {entry.durationMs !== undefined && (
                        <span className="text-xs text-slate-600 shrink-0 w-14 text-right">{entry.durationMs}ms</span>
                      )}
                      <span className="text-xs text-slate-600 shrink-0 w-20 text-right">
                        {formatTime(entry.timestamp)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyAsCurl(entry); }}
                        className="p-1 rounded hover:bg-slate-700 text-slate-600 hover:text-slate-300 transition-colors shrink-0"
                        title="Copy as cURL"
                      >
                        {copiedId === entry.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-4 pb-3 space-y-2">
                        <div className="text-xs text-slate-600">{formatDate(entry.timestamp)} {formatTime(entry.timestamp)}</div>
                        {entry.request.headers && Object.keys(entry.request.headers).length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 font-medium mb-1">Request Headers</p>
                            <div className="text-xs font-mono text-slate-400 bg-slate-950/50 rounded p-2 space-y-0.5">
                              {Object.entries(entry.request.headers).map(([k, v]) => (
                                <div key={k}><span className="text-slate-600">{k}:</span> {String(v)}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        {entry.request.body && (
                          <div>
                            <p className="text-xs text-slate-500 font-medium mb-1">Request Body</p>
                            <pre className="text-xs font-mono text-emerald-400 bg-slate-950/50 rounded p-2 whitespace-pre-wrap max-h-32 overflow-auto">
                              {typeof entry.request.body === 'string' ? entry.request.body : JSON.stringify(entry.request.body, null, 2)}
                            </pre>
                          </div>
                        )}
                        {entry.response && (
                          <div>
                            <p className="text-xs text-slate-500 font-medium mb-1">Response ({entry.response.statusCode})</p>
                            <pre className="text-xs font-mono text-slate-300 bg-slate-950/50 rounded p-2 whitespace-pre-wrap max-h-40 overflow-auto">
                              {typeof entry.response.body === 'string' ? entry.response.body : JSON.stringify(entry.response.body, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 text-xs text-slate-600">
              History is stored locally (max 200 entries). Cleared on "Clear All".
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default RequestHistory;

