/**
 * Request History — stores every executed request in localStorage
 * with timestamp, method, URL, status, and duration.
 */

export interface HistoryEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  statusCode?: number;
  durationMs?: number;
  request: {
    headers?: Record<string, string>;
    body?: any;
  };
  response?: {
    statusCode: number;
    headers?: Record<string, string>;
    body?: any;
  };
}

const STORAGE_KEY = 'loadforge-request-history';
const MAX_ENTRIES = 200;

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToHistory(entry: HistoryEntry): void {
  const history = getHistory();
  history.unshift(entry); // newest first
  if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function createHistoryEntry(result: any): HistoryEntry | null {
  if (!result.request) return null;
  return {
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    method: result.request.method,
    url: result.request.url,
    statusCode: result.response?.statusCode,
    durationMs: result.durationMs,
    request: {
      headers: result.request.headers,
      body: result.request.body,
    },
    response: result.response ? {
      statusCode: result.response.statusCode,
      headers: result.response.headers,
      body: result.response.body,
    } : undefined,
  };
}

