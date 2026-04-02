import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFlowStore } from '../store/flowStore';

/**
 * VariableInput — input/textarea with:
 *   1. Postman-style {{variable}} syntax highlighting (overlay approach)
 *   2. Autocomplete dropdown on {{ typing
 *   3. Hover tooltip showing resolved value
 *   4. Click-to-edit popover for ENV variables
 */

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
}

interface TooltipState {
  varName: string;
  resolvedValue: string;
  source: string;
  x: number;
  y: number;
}

interface PopoverState {
  varName: string;
  rootVar: string;
  resolvedValue: string;
  source: string;
  x: number;
  y: number;
}

const BUILTIN_VARS = [
  { key: '_conditionResult', desc: 'Last conditional result (boolean)' },
  { key: '_loopItems', desc: 'Current loop array' },
  { key: '_loopCount', desc: 'Loop array length' },
  { key: '_currentItem', desc: 'Current loop item' },
  { key: '_loopIndex', desc: 'Current loop index' },
  { key: '_lastStatusCode', desc: 'Last HTTP status code' },
  { key: '_lastResponseTime', desc: 'Last HTTP response time (ms)' },
];

// ─── Hover tooltip ───────────────────────────────────────────────────────────
const VariableTooltip: React.FC<{ tooltip: TooltipState }> = ({ tooltip }) => {
  return createPortal(
    <div
      className="fixed z-[9998] px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-600 shadow-xl text-xs max-w-[280px] pointer-events-none"
      style={{ left: tooltip.x, top: tooltip.y - 40, transform: 'translateX(-50%)' }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
          tooltip.source === 'env' ? 'bg-emerald-900/50 text-emerald-400' :
          tooltip.source === 'extractor' ? 'bg-purple-900/50 text-purple-400' :
          tooltip.source === 'unresolved' ? 'bg-red-900/50 text-red-400' :
          'bg-amber-900/50 text-amber-400'
        }`}>
          {tooltip.source === 'env' ? 'ENV' : tooltip.source === 'extractor' ? 'VAR' : tooltip.source === 'unresolved' ? '?' : 'SYS'}
        </span>
        <span className="font-mono text-blue-300 truncate">{tooltip.varName}</span>
      </div>
      <div className="font-mono text-slate-300 truncate">{tooltip.resolvedValue}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">Click to {tooltip.source === 'env' ? 'edit' : 'view'}</div>
    </div>,
    document.body
  );
};

// ─── Click-to-edit popover ───────────────────────────────────────────────────
const VariablePopover: React.FC<{
  popover: PopoverState;
  onClose: () => void;
  onSave: (varName: string, newValue: string) => void;
}> = ({ popover, onClose, onSave }) => {
  const [editValue, setEditValue] = useState(popover.resolvedValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const isEditable = popover.source === 'env';

  useEffect(() => {
    if (isEditable) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isEditable]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = () => {
    if (isEditable && editValue !== popover.resolvedValue) onSave(popover.rootVar, editValue);
    onClose();
  };

  const sourceLabel =
    popover.source === 'env' ? 'Environment Variable' :
    popover.source === 'extractor' ? 'Extracted Variable' :
    popover.source === 'unresolved' ? 'Unresolved Variable' : 'System Variable';

  const badgeCls =
    popover.source === 'env' ? 'bg-emerald-900/50 text-emerald-400' :
    popover.source === 'extractor' ? 'bg-purple-900/50 text-purple-400' :
    popover.source === 'unresolved' ? 'bg-red-900/50 text-red-400' :
    'bg-amber-900/50 text-amber-400';

  return createPortal(
    <div ref={popRef} className="fixed z-[9999] w-[260px] rounded-lg bg-slate-800 border border-slate-600 shadow-2xl"
      style={{ left: Math.max(10, popover.x - 130), top: popover.y + 8 }}>
      <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${badgeCls}`}>
            {popover.source === 'env' ? 'ENV' : popover.source === 'extractor' ? 'VAR' : popover.source === 'unresolved' ? '?' : 'SYS'}
          </span>
          <span className="text-xs text-slate-400">{sourceLabel}</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm leading-none">✕</button>
      </div>
      <div className="px-3 py-2 space-y-2">
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider">Name</label>
          <div className="text-xs font-mono text-blue-300 mt-0.5">{popover.varName}</div>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider">Value</label>
          {isEditable ? (
            <input ref={inputRef} value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              className="mt-0.5 w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-600 text-xs font-mono text-slate-200 focus:border-blue-500 focus:outline-none" />
          ) : (
            <div className="mt-0.5 px-2 py-1.5 rounded bg-slate-900/50 text-xs font-mono text-slate-400 truncate">
              {popover.resolvedValue}
            </div>
          )}
        </div>
      </div>
      {isEditable && (
        <div className="px-3 py-2 border-t border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs text-white transition-colors">Save</button>
        </div>
      )}
    </div>,
    document.body
  );
};

// ─── Highlight renderer ──────────────────────────────────────────────────────
function renderHighlightedText(
  text: string,
  knownVars: Set<string>,
  resolvedValues: Map<string, { value: string; source: string }>,
  onTokenHover: (varName: string, source: string, resolvedValue: string, rect: DOMRect) => void,
  onTokenLeave: () => void,
  onTokenClick: (varName: string, rootVar: string, source: string, resolvedValue: string, rect: DOMRect) => void,
): React.ReactNode[] {
  if (!text) return [];
  const parts: React.ReactNode[] = [];
  const regex = /(\{\{[\w.]*}?}?)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`t-${lastIndex}`} className="text-slate-300">{text.slice(lastIndex, match.index)}</span>);
    }
    const token = match[1];
    const isComplete = token.startsWith('{{') && token.endsWith('}}');
    const varName = isComplete ? token.slice(2, -2) : token.slice(2);
    const rootVar = varName.split('.')[0];
    const isKnown = isComplete && knownVars.has(rootVar);
    const resolved = isComplete ? resolvedValues.get(rootVar) : undefined;

    parts.push(
      <span key={`v-${match.index}`}
        className={isComplete
          ? isKnown
            ? 'text-orange-400 bg-orange-500/15 rounded-sm px-[1px] cursor-pointer hover:bg-orange-500/25 transition-colors pointer-events-auto'
            : 'text-red-400 bg-red-500/10 rounded-sm px-[1px] border-b border-dotted border-red-400/40 cursor-pointer hover:bg-red-500/20 transition-colors pointer-events-auto'
          : 'text-orange-400/50'}
        onMouseEnter={(e) => {
          if (!isComplete) return;
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          onTokenHover(varName, resolved?.source || 'unresolved', resolved?.value ?? 'unresolved', rect);
        }}
        onMouseLeave={onTokenLeave}
        onClick={(e) => {
          if (!isComplete) return;
          e.stopPropagation();
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          onTokenClick(varName, rootVar, resolved?.source || 'unresolved', resolved?.value ?? '', rect);
        }}
      >{token}</span>
    );
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={`t-${lastIndex}`} className="text-slate-300">{text.slice(lastIndex)}</span>);
  }
  return parts;
}

// ─── Main Component ──────────────────────────────────────────────────────────
const VariableInput: React.FC<VariableInputProps> = ({ value, onChange, placeholder, className = '', multiline = false, rows = 1 }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentFlow = useFlowStore((s) => s.currentFlow);
  const environments = useFlowStore((s) => s.environments);
  const activeEnvId = useFlowStore((s) => s.activeEnvironmentId);
  const updateEnvironment = useFlowStore((s) => s.updateEnvironment);

  const getVariables = useCallback((): Array<{ key: string; source: string; desc?: string }> => {
    const vars: Array<{ key: string; source: string; desc?: string }> = [];
    const activeEnv = environments?.find((e: any) => e.id === activeEnvId);
    if (activeEnv) {
      for (const v of activeEnv.variables) {
        if (v.enabled && v.key) vars.push({ key: v.key, source: 'env', desc: `${activeEnv.name}: ${v.value || ''}` });
      }
    }
    if (currentFlow) {
      for (const node of currentFlow.nodes) {
        if (node.type === 'variable-extractor' && node.data.variableName) {
          vars.push({ key: node.data.variableName, source: 'extractor', desc: `${node.data.label} → ${node.data.jsonPath || ''}` });
        }
      }
    }
    for (const bv of BUILTIN_VARS) vars.push({ key: bv.key, source: 'builtin', desc: bv.desc });
    return vars;
  }, [environments, activeEnvId, currentFlow]);

  const knownVarNames = useMemo(() => {
    const names = new Set<string>();
    const activeEnv = environments?.find((e: any) => e.id === activeEnvId);
    if (activeEnv) for (const v of activeEnv.variables) { if (v.enabled && v.key) names.add(v.key); }
    if (currentFlow) for (const node of currentFlow.nodes) { if (node.type === 'variable-extractor' && node.data.variableName) names.add(node.data.variableName); }
    for (const bv of BUILTIN_VARS) names.add(bv.key);
    return names;
  }, [environments, activeEnvId, currentFlow]);

  const resolvedValues = useMemo(() => {
    const map = new Map<string, { value: string; source: string }>();
    const activeEnv = environments?.find((e: any) => e.id === activeEnvId);
    if (activeEnv) for (const v of activeEnv.variables) { if (v.enabled && v.key) map.set(v.key, { value: v.value || '', source: 'env' }); }
    if (currentFlow) for (const node of currentFlow.nodes) { if (node.type === 'variable-extractor' && node.data.variableName) map.set(node.data.variableName, { value: `← ${node.data.jsonPath || '$.?'}`, source: 'extractor' }); }
    for (const bv of BUILTIN_VARS) map.set(bv.key, { value: bv.desc, source: 'builtin' });
    return map;
  }, [environments, activeEnvId, currentFlow]);

  const handleTokenHover = useCallback((varName: string, source: string, resolvedValue: string, rect: DOMRect) => {
    if (popover) return;
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip({ varName, resolvedValue, source, x: rect.left + rect.width / 2, y: rect.top });
  }, [popover]);

  const handleTokenLeave = useCallback(() => {
    tooltipTimer.current = setTimeout(() => setTooltip(null), 150);
  }, []);

  const handleTokenClick = useCallback((varName: string, rootVar: string, source: string, resolvedValue: string, rect: DOMRect) => {
    setTooltip(null);
    setPopover({ varName, rootVar, resolvedValue, source, x: rect.left + rect.width / 2, y: rect.bottom });
  }, []);

  const handlePopoverSave = useCallback((varName: string, newValue: string) => {
    if (!activeEnvId) return;
    const activeEnv = environments?.find((e: any) => e.id === activeEnvId);
    if (!activeEnv) return;
    const updatedVars = activeEnv.variables.map((v: any) =>
      v.key === varName ? { ...v, value: newValue } : v
    );
    updateEnvironment(activeEnvId, { variables: updatedVars });
  }, [activeEnvId, environments, updateEnvironment]);

  const syncScroll = useCallback(() => {
    if (inputRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = inputRef.current.scrollTop;
      highlightRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  }, []);

  const handleInput = useCallback((newValue: string, selStart: number) => {
    onChange(newValue);
    setCursorPos(selStart);
    const before = newValue.slice(0, selStart);
    const lastOpen = before.lastIndexOf('{{');
    const lastClose = before.lastIndexOf('}}');
    if (lastOpen > lastClose) {
      setFilter(before.slice(lastOpen + 2).toLowerCase());
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [onChange]);

  const insertVariable = useCallback((varKey: string) => {
    const before = value.slice(0, cursorPos);
    const after = value.slice(cursorPos);
    const lastOpen = before.lastIndexOf('{{');
    if (lastOpen >= 0) onChange(before.slice(0, lastOpen) + `{{${varKey}}}` + after);
    setShowDropdown(false);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [value, cursorPos, onChange]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { return () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); }; }, []);

  const allVars = getVariables();
  const filtered = filter ? allVars.filter((v) => v.key.toLowerCase().includes(filter)) : allVars;
  const sourceColors: Record<string, string> = { env: 'text-emerald-400', extractor: 'text-purple-400', builtin: 'text-amber-400' };
  const sourceBadges: Record<string, string> = { env: 'ENV', extractor: 'VAR', builtin: 'SYS' };
  const hasVariables = value?.includes('{{');

  const highlightedContent = useMemo(() => {
    if (!hasVariables) return null;
    return renderHighlightedText(value || '', knownVarNames, resolvedValues, handleTokenHover, handleTokenLeave, handleTokenClick);
  }, [value, knownVarNames, resolvedValues, hasVariables, handleTokenHover, handleTokenLeave, handleTokenClick]);

  const sharedStyle: React.CSSProperties = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '0.75rem', lineHeight: '1.25rem', letterSpacing: '0', wordSpacing: '0',
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input sits at z-index 1 — receives keyboard/typing events */}
      {multiline ? (
        <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value || ''} placeholder={placeholder}
          className={`${className} input-field font-mono text-xs relative`}
          style={{ ...sharedStyle, background: hasVariables ? 'transparent' : undefined, caretColor: '#94a3b8', color: hasVariables ? 'transparent' : undefined, zIndex: 1 }}
          rows={rows}
          onChange={(e) => handleInput(e.target.value, e.target.selectionStart || 0)}
          onScroll={syncScroll}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowDropdown(false); }} />
      ) : (
        <input ref={inputRef as React.RefObject<HTMLInputElement>}
          value={value || ''} placeholder={placeholder}
          className={`${className} input-field font-mono text-xs relative`}
          style={{ ...sharedStyle, background: hasVariables ? 'transparent' : undefined, caretColor: '#94a3b8', color: hasVariables ? 'transparent' : undefined, zIndex: 1 }}
          onChange={(e) => handleInput(e.target.value, e.target.selectionStart || 0)}
          onScroll={syncScroll}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowDropdown(false); }} />
      )}
      {/* Highlight overlay sits ON TOP at z-index 2.
          Container is pointer-events-none so typing passes through.
          Variable token <span>s are pointer-events-auto for hover/click. */}
      {hasVariables && (
        <div ref={highlightRef} aria-hidden="true"
          className="input-field font-mono text-xs absolute inset-0 overflow-hidden whitespace-pre pointer-events-none"
          style={{ ...sharedStyle, color: 'transparent', background: 'transparent', zIndex: 2, userSelect: 'none' }}>
          {highlightedContent}
        </div>
      )}
      {tooltip && !popover && <VariableTooltip tooltip={tooltip} />}
      {popover && <VariablePopover popover={popover} onClose={() => setPopover(null)} onSave={handlePopoverSave} />}
      {showDropdown && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
          {filtered.map((v, i) => (
            <button key={`${v.source}-${v.key}-${i}`} onClick={() => insertVariable(v.key)}
              className="w-full px-2.5 py-1.5 text-left hover:bg-slate-700 flex items-center gap-2 transition-colors first:rounded-t-lg last:rounded-b-lg">
              <span className={`text-[10px] font-bold px-1 py-0.5 rounded bg-slate-900 ${sourceColors[v.source] || 'text-slate-400'}`}>
                {sourceBadges[v.source] || v.source}
              </span>
              <span className="text-xs font-mono text-blue-300 flex-1 truncate">{v.key}</span>
              {v.desc && <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{v.desc}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VariableInput;
