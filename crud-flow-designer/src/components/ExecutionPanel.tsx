import React, { useRef, useEffect, useState, memo, useCallback, createContext, useContext } from 'react';
import { useFlowStore } from '../store/flowStore';
import { Trash2, CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight, Copy, Check, ChevronUp, X, Code2 } from 'lucide-react';
// @ts-ignore - mark.js doesn't ship ESM types
import Mark from 'mark.js/dist/mark.es6.min.js';
import { generateCode, type CodeLanguage } from '../utils/codeGenerator';

// ── Search context — lets nested components know if search is active ──
const SearchContext = createContext<string>('');

// ── Lightweight JSON syntax colorizer (for Raw-ish Body tab) ──
function JsonHighlight({ data }: { data: any }) {
  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  if (!json) return null;

  const colored = json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"([^"]+)"(?=\s*:)/g, '<span class="text-blue-400">"$1"</span>')
    .replace(/:\s*"([^"]*)"/g, ': <span class="text-emerald-400">"$1"</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span class="text-amber-400">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="text-purple-400">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="text-slate-500">$1</span>');

  return (
    <pre
      className="text-xs font-mono text-slate-300 whitespace-pre-wrap break-words leading-relaxed"
      dangerouslySetInnerHTML={{ __html: colored }}
    />
  );
}

// ── Interactive JSON tree viewer (like browser DevTools) ──
function JsonValue({ value }: { value: any }) {
  if (value === null) return <span className="text-slate-500">null</span>;
  if (value === undefined) return <span className="text-slate-500">undefined</span>;
  if (typeof value === 'boolean') return <span className="text-purple-400">{String(value)}</span>;
  if (typeof value === 'number') return <span className="text-amber-400">{value}</span>;
  if (typeof value === 'string') {
    const display = value.length > 120 ? value.slice(0, 120) + '…' : value;
    return <span className="text-emerald-400">"{display}"</span>;
  }
  return null;
}

const JsonTreeNode = memo(({ keyName, value, depth = 0, defaultOpen = false }: {
  keyName?: string;
  value: any;
  depth?: number;
  defaultOpen?: boolean;
}) => {
  const searchQuery = useContext(SearchContext);
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);

  // When search is active, force all nodes open so mark.js can find text
  const forceOpen = searchQuery.length >= 1;
  const [manualOpen, setManualOpen] = useState(defaultOpen || depth < 1);
  const open = forceOpen || manualOpen;

  if (!isObject) {
    return (
      <div className="flex items-start gap-0.5" style={{ paddingLeft: depth * 16 }}>
        {keyName !== undefined && (
          <span className="text-blue-400 shrink-0">{keyName}: </span>
        )}
        <JsonValue value={value} />
      </div>
    );
  }

  const entries = isArray
    ? value.map((v: any, i: number) => [String(i), v] as [string, any])
    : Object.entries(value);
  const count = entries.length;
  const bracket = isArray ? ['[', ']'] : ['{', '}'];
  const preview = isArray
    ? `Array(${count})`
    : count <= 3
    ? `{${entries.map(([k]: [string, any]) => k).join(', ')}}`
    : `{${entries.slice(0, 3).map(([k]: [string, any]) => k).join(', ')}, …}`;

  return (
    <div>
      <div
        className="flex items-start gap-0.5 cursor-pointer hover:bg-slate-800/40 rounded px-0.5 -mx-0.5 group"
        style={{ paddingLeft: depth * 16 }}
        onClick={() => setManualOpen(!manualOpen)}
      >
        <span className="text-slate-600 w-3 shrink-0 mt-px select-none">
          {open ? '▼' : '▶'}
        </span>
        {keyName !== undefined && (
          <span className="text-blue-400 shrink-0">{keyName}: </span>
        )}
        {!open && (
          <span className="text-slate-500 truncate">{preview}</span>
        )}
        {open && (
          <span className="text-slate-600">{bracket[0]}</span>
        )}
        {open && count === 0 && (
          <span className="text-slate-600">{bracket[1]}</span>
        )}
      </div>
      {open && count > 0 && (
        <>
          {entries.map(([k, v]: [string, any]) => (
            <JsonTreeNode
              key={k}
              keyName={isArray ? undefined : k}
              value={v}
              depth={depth + 1}
              defaultOpen={depth < 0}
            />
          ))}
          <div style={{ paddingLeft: depth * 16 + 12 }}>
            <span className="text-slate-600">{bracket[1]}</span>
          </div>
        </>
      )}
    </div>
  );
});

function JsonTree({ data }: { data: any }) {
  if (data === null || data === undefined) {
    return <div className="text-xs text-slate-600 italic">Empty</div>;
  }
  if (typeof data !== 'object') {
    return (
      <div className="text-xs font-mono">
        <JsonValue value={data} />
      </div>
    );
  }
  return (
    <div className="text-xs font-mono leading-5">
      <JsonTreeNode value={data} defaultOpen={true} />
    </div>
  );
}

// ── Copy button ──
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Tab button ──
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs font-medium rounded-t transition-colors ${
        active
          ? 'bg-slate-950/80 text-blue-400 border-b-2 border-blue-400'
          : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {children}
    </button>
  );
}

// ── Search/Find bar using mark.js ──
// Search bar is sticky, content scrolls underneath. Debounced to avoid scroll jank.
function SearchablePanel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const markRef = useRef<Mark | null>(null);

  // Debounce query — only highlight after user stops typing for 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Jump to match (no DOM rebuild, just class swap)
  const jumpTo = useCallback((idx: number) => {
    if (!contentRef.current) return;
    const marks = contentRef.current.querySelectorAll('mark.search-hl');
    marks.forEach((m, i) => {
      if (i === idx) {
        m.classList.add('current');
        // Scroll within the scroll container, not the whole page
        m.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        m.classList.remove('current');
      }
    });
    setCurrent(idx);
  }, []);

  // Run mark.js highlight — only triggered by debounced query
  useEffect(() => {
    if (!contentRef.current) return;
    // Recreate Mark instance each time (safe — content may have changed via tab switch / tree expand)
    markRef.current = new Mark(contentRef.current);

    // Save scroll position
    const scrollEl = scrollRef.current;
    const scrollTop = scrollEl?.scrollTop || 0;

    markRef.current.unmark({
      done: () => {
        if (!debouncedQuery || debouncedQuery.length < 1) {
          setTotal(0);
          setCurrent(0);
          return;
        }
        markRef.current!.mark(debouncedQuery, {
          separateWordSearch: false,
          className: 'search-hl',
          acrossElements: true,
          done: (count: number) => {
            setTotal(count);
            // Restore scroll position first (mark.js may have shifted it)
            if (scrollEl) scrollEl.scrollTop = scrollTop;
            if (count > 0) {
              // Jump to first match after a tick so DOM is settled
              setTimeout(() => jumpTo(0), 20);
            } else {
              setCurrent(-1);
            }
          },
        });
      },
    });
  }, [debouncedQuery, jumpTo]);

  const goNext = () => { if (total > 0) jumpTo((current + 1) % total); };
  const goPrev = () => { if (total > 0) jumpTo((current - 1 + total) % total); };

  const openSearch = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  };
  const closeSearch = () => {
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
    markRef.current?.unmark();
    setTotal(0);
    setCurrent(0);
  };

  // Ctrl+F
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        openSearch();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="relative">
      {/* Floating search bar — sticky at top of content area */}
      {open && (
        <div className="sticky top-0 z-20 mb-1">
          <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-2 py-1.5 border border-slate-600/50 shadow-lg shadow-black/30">
            <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? goPrev() : goNext(); }
                if (e.key === 'Escape') closeSearch();
              }}
              placeholder="Find..."
              className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none font-mono placeholder:text-slate-600 min-w-0"
              autoFocus
            />
            {query.length >= 1 && (
              <span className="text-xs tabular-nums whitespace-nowrap shrink-0" style={{ color: total > 0 ? '#94a3b8' : '#ef4444' }}>
                {total > 0 ? `${current + 1} of ${total}` : 'No results'}
              </span>
            )}
            <div className="flex items-center gap-0.5 border-l border-slate-700 pl-1.5 shrink-0">
              <button onClick={goPrev} disabled={total === 0} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20 transition-colors" title="Previous (Shift+Enter)">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={goNext} disabled={total === 0} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20 transition-colors" title="Next (Enter)">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button onClick={closeSearch} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors" title="Close (Esc)">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search icon when closed */}
      {!open && (
        <div className="flex justify-end mb-1">
          <button
            onClick={openSearch}
            className="p-1 rounded hover:bg-slate-700/80 text-slate-600 hover:text-slate-300 transition-colors"
            title="Find (⌘F)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      )}

      {/* Scrollable content — SearchContext auto-expands tree nodes when searching */}
      <SearchContext.Provider value={debouncedQuery}>
        <div ref={scrollRef}>
          <div ref={contentRef}>
            {children}
          </div>
        </div>
      </SearchContext.Provider>
    </div>
  );
}

// ── Response detail viewer ──
function ResponseViewer({ result }: { result: any }) {
  const [reqTab, setReqTab] = useState<'body' | 'headers'>('body');
  const [resTab, setResTab] = useState<'preview' | 'body' | 'headers' | 'raw'>('preview');

  const resBody = result.response?.body;
  const resHeaders = result.response?.headers || {};
  const resRaw = typeof resBody === 'string' ? resBody : JSON.stringify(resBody, null, 2) || '';
  const resSize = new Blob([resRaw]).size;
  const resSizeLabel = resSize > 1024 ? `${(resSize / 1024).toFixed(1)} KB` : `${resSize} B`;

  return (
    <div className="px-3 pb-3 space-y-3">
      {/* Request section */}
      {result.request && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500 font-medium">Request</p>
              <Tab active={reqTab === 'body'} onClick={() => setReqTab('body')}>Body</Tab>
              <Tab active={reqTab === 'headers'} onClick={() => setReqTab('headers')}>Headers</Tab>
            </div>
            <CopyBtn text={
              reqTab === 'body'
                ? (typeof result.request.body === 'string' ? result.request.body : JSON.stringify(result.request.body, null, 2) || '')
                : Object.entries(result.request.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')
            } />
          </div>
          <div className="bg-slate-950/60 rounded-lg border border-slate-700/50 max-h-40 overflow-auto">
            <SearchablePanel>
            <div className="p-2.5">
            {/* URL line always visible */}
            <div className="text-xs font-mono text-blue-400 mb-1.5 break-all">
              {result.request.method} {result.request.url}
            </div>
            {reqTab === 'headers' && result.request.headers && (
              <div className="text-xs font-mono text-slate-400 space-y-0.5">
                {Object.entries(result.request.headers).map(([k, v]) => (
                  <div key={k}><span className="text-slate-500">{k}:</span> {String(v)}</div>
                ))}
                {Object.keys(result.request.headers).length === 0 && (
                  <div className="text-slate-600 italic">No headers</div>
                )}
              </div>
            )}
            {reqTab === 'body' && (
              result.request.body
                ? <JsonHighlight data={result.request.body} />
                : <div className="text-xs text-slate-600 italic">No body</div>
            )}
            </div>
            </SearchablePanel>
          </div>
        </div>
      )}

      {/* Response section */}
      {result.response && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500 font-medium">Response</p>
              {/* Status badge */}
              <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                result.response.statusCode >= 200 && result.response.statusCode < 300
                  ? 'bg-green-500/10 text-green-400'
                  : result.response.statusCode >= 400
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-yellow-500/10 text-yellow-400'
              }`}>
                {result.response.statusCode}
              </span>
              <span className="text-xs text-slate-600">{resSizeLabel}</span>
              <div className="w-px h-3 bg-slate-700" />
              <Tab active={resTab === 'preview'} onClick={() => setResTab('preview')}>Preview</Tab>
              <Tab active={resTab === 'body'} onClick={() => setResTab('body')}>Body</Tab>
              <Tab active={resTab === 'headers'} onClick={() => setResTab('headers')}>
                Headers {Object.keys(resHeaders).length > 0 && `(${Object.keys(resHeaders).length})`}
              </Tab>
              <Tab active={resTab === 'raw'} onClick={() => setResTab('raw')}>Raw</Tab>
            </div>
            <CopyBtn text={
              resTab === 'raw' ? resRaw
              : resTab === 'headers' ? Object.entries(resHeaders).map(([k, v]) => `${k}: ${v}`).join('\n')
              : resRaw
            } />
          </div>
          <div className="bg-slate-950/60 rounded-lg border border-slate-700/50 max-h-64 overflow-auto">
            <SearchablePanel>
            <div className="p-2.5">
            {resTab === 'preview' && (
              resBody !== undefined && resBody !== null
                ? <JsonTree data={resBody} />
                : <div className="text-xs text-slate-600 italic">Empty response</div>
            )}
            {resTab === 'body' && (
              resBody !== undefined && resBody !== null
                ? <JsonHighlight data={resBody} />
                : <div className="text-xs text-slate-600 italic">Empty response</div>
            )}
            {resTab === 'headers' && (
              <div className="text-xs font-mono text-slate-400 space-y-0.5">
                {Object.entries(resHeaders).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-slate-500">{k}:</span> {String(v)}
                  </div>
                ))}
                {Object.keys(resHeaders).length === 0 && (
                  <div className="text-slate-600 italic">No headers captured</div>
                )}
              </div>
            )}
            {resTab === 'raw' && (
              <pre className="text-xs font-mono text-slate-400 whitespace-pre-wrap break-words">
                {resRaw || 'Empty'}
              </pre>
            )}
            </div>
            </SearchablePanel>
          </div>
        </div>
      )}

      {/* Error display */}
      {result.error && !result.response && (
        <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-2.5">
          <p className="text-xs text-red-400 font-medium mb-1">Error</p>
          <p className="text-xs text-red-300 break-words">{result.error}</p>
        </div>
      )}

      {/* Code Generation */}
      {result.request && <CodeGenerator request={result.request} />}
    </div>
  );
}

// ── Code Generator Panel ──
function CodeGenerator({ request }: { request: { method: string; url: string; headers?: Record<string, string>; body?: any } }) {
  const [showCode, setShowCode] = useState(false);
  const [lang, setLang] = useState<CodeLanguage>('curl');
  const [copied, setCopied] = useState(false);

  if (!showCode) {
    return (
      <button
        onClick={() => setShowCode(true)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors py-1"
      >
        <Code2 className="w-3.5 h-3.5" />
        Generate Code
      </button>
    );
  }

  const code = generateCode(request, lang);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-slate-500" />
          <p className="text-xs text-slate-500 font-medium">Code</p>
          {(['curl', 'python', 'javascript'] as CodeLanguage[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                lang === l
                  ? 'bg-slate-800 text-blue-400 font-medium'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {l === 'curl' ? 'cURL' : l === 'python' ? 'Python' : 'JS Fetch'}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
          title="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="text-xs font-mono text-slate-300 bg-slate-950/60 rounded-lg border border-slate-700/50 p-2.5 whitespace-pre-wrap break-all max-h-48 overflow-auto">
        {code}
      </pre>
    </div>
  );
}

const ExecutionPanel: React.FC = () => {
  const { executionLog, executionResults, isExecuting, clearExecution, currentFlow } = useFlowStore();
  const logEndRef = useRef<HTMLDivElement>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const getNodeLabel = (nodeId: string) => {
    const node = currentFlow?.nodes.find((n) => n.id === nodeId);
    return node?.data?.label || nodeId;
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [executionLog]);

  const hasData = executionLog.length > 0 || executionResults.length > 0;
  if (!hasData) return null;

  const passed = executionResults.filter((r) => r.status === 'success').length;
  const failed = executionResults.filter((r) => r.status === 'error').length;
  const total = executionResults.length;

  return (
    <div className="w-full h-full bg-slate-900/95 border-l border-blue-500/20 flex flex-col text-sm">
      {/* Header */}
      <div className="p-3 border-b border-blue-500/20 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-blue-400">Execution Results</h3>
          {!isExecuting && total > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              <span className="text-green-400">{passed} passed</span>
              {failed > 0 && <span className="text-red-400"> · {failed} failed</span>}
              <span className="text-slate-500"> · {total} total</span>
            </p>
          )}
          {isExecuting && (
            <p className="text-xs text-cyan-400 animate-pulse mt-0.5">Running...</p>
          )}
        </div>
        <button
          onClick={clearExecution}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
          title="Clear results"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Results list */}
      {executionResults.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {executionResults.map((result, i) => {
            const isExpanded = expandedIdx === i;
            return (
              <div key={i} className={`border-b border-slate-800/50 ${result.status === 'error' ? 'bg-red-950/20' : ''}`}>
                {/* Summary row — clickable */}
                <div
                  className="px-3 py-2 flex items-start gap-2 cursor-pointer hover:bg-slate-800/30 transition-colors"
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                >
                  {result.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : result.status === 'error' ? (
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {isExpanded
                        ? <ChevronDown className="w-3 h-3 text-slate-500" />
                        : <ChevronRight className="w-3 h-3 text-slate-500" />
                      }
                      <span className="text-xs text-slate-300 font-medium truncate">
                        {getNodeLabel(result.nodeId)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {result.request && (
                        <span className="text-xs text-slate-500 font-mono">
                          {result.request.method}
                        </span>
                      )}
                      {result.response && (
                        <span className={`text-xs font-mono font-bold ${
                          result.response.statusCode >= 200 && result.response.statusCode < 300
                            ? 'text-green-400'
                            : result.response.statusCode >= 400
                            ? 'text-red-400'
                            : 'text-yellow-400'
                        }`}>
                          {result.response.statusCode}
                        </span>
                      )}
                      {result.durationMs !== undefined && (
                        <span className="text-xs text-slate-600">{result.durationMs}ms</span>
                      )}
                    </div>
                    {result.error && (
                      <div className="text-xs text-red-400 mt-0.5 break-words">{result.error}</div>
                    )}
                    {result.variables && Object.keys(result.variables).length > 0 && (
                      <div className="text-xs text-purple-400 mt-0.5">
                        {Object.entries(result.variables).map(([k, v]) => (
                          <span key={k}>{k} = {JSON.stringify(v)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded detail — tabbed response viewer */}
                {isExpanded && <ResponseViewer result={result} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Live log */}
      <div className="flex-shrink-0 max-h-[30%] overflow-y-auto p-3 font-mono text-xs border-t border-blue-500/20">
        {executionLog.map((entry, i) => (
          <div key={i} className="text-slate-300 py-0.5 leading-relaxed">
            {entry}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default ExecutionPanel;

