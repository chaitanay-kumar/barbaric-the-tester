import { create } from 'zustand';
import { Node, Edge } from 'reactflow';
import type { FlowStore, FlowConfig, ExecutionContext, ExecutionResult, Environment } from '../types/flow';
import { ExecutionEngine } from '../services/executionEngine';

// Module-level engine ref (avoids window global)
let _activeEngine: ExecutionEngine | null = null;

// ── LocalStorage helpers ──
const LS_KEY = 'loadforge-flows';
const LS_CURRENT = 'loadforge-current-id';
const LS_ENVS = 'loadforge-environments';
const LS_ACTIVE_ENV = 'loadforge-active-env';

function loadFlowsFromStorage(): FlowConfig[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveFlowsToStorage(flows: FlowConfig[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(flows));
}

function saveCurrentId(id: string | null) {
  if (id) localStorage.setItem(LS_CURRENT, id);
  else localStorage.removeItem(LS_CURRENT);
}

function loadCurrentId(): string | null {
  return localStorage.getItem(LS_CURRENT);
}

function loadEnvironments(): Environment[] {
  try {
    const raw = localStorage.getItem(LS_ENVS);
    return raw ? JSON.parse(raw) : getDefaultEnvironments();
  } catch { return getDefaultEnvironments(); }
}

function saveEnvironments(envs: Environment[]) {
  localStorage.setItem(LS_ENVS, JSON.stringify(envs));
}

function loadActiveEnvId(): string | null {
  return localStorage.getItem(LS_ACTIVE_ENV);
}

function saveActiveEnvId(id: string | null) {
  if (id) localStorage.setItem(LS_ACTIVE_ENV, id);
  else localStorage.removeItem(LS_ACTIVE_ENV);
}

function getDefaultEnvironments(): Environment[] {
  return [
    {
      id: 'env-dev',
      name: 'Development',
      variables: [
        { key: 'baseUrl', value: 'http://localhost:3000', enabled: true },
        { key: 'apiKey', value: 'dev-key-123', enabled: true },
      ],
    },
    {
      id: 'env-staging',
      name: 'Staging',
      variables: [
        { key: 'baseUrl', value: 'https://staging.api.example.com', enabled: true },
        { key: 'apiKey', value: 'staging-key-456', enabled: true },
      ],
    },
    {
      id: 'env-prod',
      name: 'Production',
      variables: [
        { key: 'baseUrl', value: 'https://api.example.com', enabled: true },
        { key: 'apiKey', value: '', enabled: false },
      ],
    },
  ];
}

// ── Debounced auto-save ──
let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleAutoSave(getState: () => FlowStore) {
  if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    const state = getState();
    if (!state.currentFlow) return;
    const exists = state.flows.some((f) => f.id === state.currentFlow!.id);
    const newFlows = exists
      ? state.flows.map((f) => (f.id === state.currentFlow!.id ? state.currentFlow! : f))
      : [...state.flows, state.currentFlow!];
    saveFlowsToStorage(newFlows);
    saveCurrentId(state.currentFlow!.id);
  }, 800);
}

// ── Debounced undo snapshot for property edits ──
// Groups rapid edits (typing) into a single undo entry
let _undoDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let _undoDebounceSnapshot: { nodes: any[]; edges: any[] } | null = null;

function pushDebouncedUndoSnapshot(getState: () => FlowStore, setState: (partial: Partial<FlowStore>) => void) {
  const { currentFlow, undoStack } = getState();
  if (!currentFlow) return;

  // Capture state on first edit of the burst
  if (!_undoDebounceSnapshot) {
    _undoDebounceSnapshot = {
      nodes: JSON.parse(JSON.stringify(currentFlow.nodes)),
      edges: JSON.parse(JSON.stringify(currentFlow.edges)),
    };
  }

  if (_undoDebounceTimer) clearTimeout(_undoDebounceTimer);
  _undoDebounceTimer = setTimeout(() => {
    if (_undoDebounceSnapshot) {
      const newStack = [...undoStack, _undoDebounceSnapshot].slice(-50);
      setState({ undoStack: newStack, redoStack: [], canUndo: true, canRedo: false });
      _undoDebounceSnapshot = null;
    }
  }, 500);
}

// ── Init from storage ──
const savedFlows = loadFlowsFromStorage();
const savedCurrentId = loadCurrentId();
const initialFlow = savedFlows.find((f) => f.id === savedCurrentId) || null;

const createDefaultFlow = (name: string): FlowConfig => ({
  id: `flow-${Date.now()}`,
  name,
  version: '1.0',
  nodes: [],
  edges: [],
  variables: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useFlowStore = create<FlowStore>((set, get) => ({
  flows: savedFlows,
  currentFlow: initialFlow,
  environments: loadEnvironments(),
  activeEnvironmentId: loadActiveEnvId(),
  executionContext: null,
  isExecuting: false,
  nodeStatuses: {},
  executionResults: [],
  executionLog: [],
  selectedNodeId: null,
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,

  createFlow: (name: string) => {
    const flow = createDefaultFlow(name);
    set((state) => {
      const newFlows = [...state.flows, flow];
      saveFlowsToStorage(newFlows);
      saveCurrentId(flow.id);
      return { flows: newFlows, currentFlow: flow, undoStack: [], redoStack: [], canUndo: false, canRedo: false };
    });
  },

  loadFlow: (flow: FlowConfig) => {
    set((state) => {
      const exists = state.flows.some((f) => f.id === flow.id);
      const newFlows = exists ? state.flows : [...state.flows, flow];
      saveFlowsToStorage(newFlows);
      saveCurrentId(flow.id);
      return { flows: newFlows, currentFlow: flow, undoStack: [], redoStack: [], canUndo: false, canRedo: false };
    });
  },

  saveFlow: () => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    const updatedFlow = {
      ...currentFlow,
      updatedAt: new Date().toISOString(),
    };

    set((state) => {
      const exists = state.flows.some((f) => f.id === updatedFlow.id);
      const newFlows = exists
        ? state.flows.map((f) => (f.id === updatedFlow.id ? updatedFlow : f))
        : [...state.flows, updatedFlow];
      saveFlowsToStorage(newFlows);
      saveCurrentId(updatedFlow.id);
      return { flows: newFlows, currentFlow: updatedFlow };
    });
  },

  updateFlowConfig: (updates: Partial<FlowConfig>) => {
    set((state) => {
      if (!state.currentFlow) return state;
      return {
        currentFlow: { ...state.currentFlow, ...updates },
      };
    });
    scheduleAutoSave(get);
  },

  deleteFlow: (flowId: string) => {
    set((state) => {
      const newFlows = state.flows.filter((f) => f.id !== flowId);
      saveFlowsToStorage(newFlows);
      const newCurrent = state.currentFlow?.id === flowId
        ? (newFlows[0] || null)
        : state.currentFlow;
      saveCurrentId(newCurrent?.id || null);
      return { flows: newFlows, currentFlow: newCurrent };
    });
  },

  // ── Environment actions ──
  addEnvironment: (env: Environment) => {
    set((state) => {
      const newEnvs = [...state.environments, env];
      saveEnvironments(newEnvs);
      return { environments: newEnvs };
    });
  },

  updateEnvironment: (envId: string, updates: Partial<Environment>) => {
    set((state) => {
      const newEnvs = state.environments.map((e) =>
        e.id === envId ? { ...e, ...updates } : e
      );
      saveEnvironments(newEnvs);
      return { environments: newEnvs };
    });
  },

  deleteEnvironment: (envId: string) => {
    set((state) => {
      const newEnvs = state.environments.filter((e) => e.id !== envId);
      saveEnvironments(newEnvs);
      const newActiveId = state.activeEnvironmentId === envId ? null : state.activeEnvironmentId;
      saveActiveEnvId(newActiveId);
      return { environments: newEnvs, activeEnvironmentId: newActiveId };
    });
  },

  setActiveEnvironment: (envId: string | null) => {
    saveActiveEnvId(envId);
    set({ activeEnvironmentId: envId });
  },

  getResolvedVariables: () => {
    const state = get();
    const vars: Record<string, string> = {};
    if (state.activeEnvironmentId) {
      const env = state.environments.find((e) => e.id === state.activeEnvironmentId);
      if (env) {
        env.variables.filter((v) => v.enabled).forEach((v) => {
          vars[v.key] = v.value;
        });
      }
    }
    return vars;
  },

  // ── Undo/Redo ──
  pushUndoSnapshot: () => {
    const { currentFlow, undoStack } = get();
    if (!currentFlow) return;
    const snapshot = {
      nodes: JSON.parse(JSON.stringify(currentFlow.nodes)),
      edges: JSON.parse(JSON.stringify(currentFlow.edges)),
    };
    const newStack = [...undoStack, snapshot].slice(-50); // max 50 entries
    set({ undoStack: newStack, redoStack: [], canUndo: true, canRedo: false });
  },

  undo: () => {
    const { currentFlow, undoStack, redoStack } = get();
    if (!currentFlow || undoStack.length === 0) return;

    // Save current state to redo stack
    const currentSnapshot = {
      nodes: JSON.parse(JSON.stringify(currentFlow.nodes)),
      edges: JSON.parse(JSON.stringify(currentFlow.edges)),
    };

    const newUndoStack = [...undoStack];
    const prevState = newUndoStack.pop()!;
    const newRedoStack = [...redoStack, currentSnapshot];

    set({
      currentFlow: { ...currentFlow, nodes: prevState.nodes, edges: prevState.edges },
      undoStack: newUndoStack,
      redoStack: newRedoStack,
      canUndo: newUndoStack.length > 0,
      canRedo: true,
    });
    scheduleAutoSave(get);
  },

  redo: () => {
    const { currentFlow, undoStack, redoStack } = get();
    if (!currentFlow || redoStack.length === 0) return;

    // Save current state to undo stack
    const currentSnapshot = {
      nodes: JSON.parse(JSON.stringify(currentFlow.nodes)),
      edges: JSON.parse(JSON.stringify(currentFlow.edges)),
    };

    const newRedoStack = [...redoStack];
    const nextState = newRedoStack.pop()!;
    const newUndoStack = [...undoStack, currentSnapshot];

    set({
      currentFlow: { ...currentFlow, nodes: nextState.nodes, edges: nextState.edges },
      undoStack: newUndoStack,
      redoStack: newRedoStack,
      canUndo: true,
      canRedo: newRedoStack.length > 0,
    });
    scheduleAutoSave(get);
  },

  addNode: (node: Node) => {
    get().pushUndoSnapshot();
    set((state) => {
      if (!state.currentFlow) return state;
      return {
        currentFlow: {
          ...state.currentFlow,
          nodes: [...state.currentFlow.nodes, node],
        },
      };
    });
  },

  updateNode: (nodeId: string, data: any) => {
    // Debounced undo snapshot for data edits (Layer 2 — property changes)
    pushDebouncedUndoSnapshot(get, set);
    set((state) => {
      if (!state.currentFlow) return state;
      return {
        currentFlow: {
          ...state.currentFlow,
          nodes: state.currentFlow.nodes.map((node) =>
            node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
          ),
        },
      };
    });
    scheduleAutoSave(get);
  },

  deleteNode: (nodeId: string) => {
    get().pushUndoSnapshot();
    set((state) => {
      if (!state.currentFlow) return state;
      return {
        currentFlow: {
          ...state.currentFlow,
          nodes: state.currentFlow.nodes.filter((node) => node.id !== nodeId),
          edges: state.currentFlow.edges.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId
          ),
        },
      };
    });
  },

  addEdge: (edge: Edge) => {
    get().pushUndoSnapshot();
    set((state) => {
      if (!state.currentFlow) return state;
      return {
        currentFlow: {
          ...state.currentFlow,
          edges: [...state.currentFlow.edges, edge],
        },
      };
    });
  },

  deleteEdge: (edgeId: string) => {
    get().pushUndoSnapshot();
    set((state) => {
      if (!state.currentFlow) return state;
      return {
        currentFlow: {
          ...state.currentFlow,
          edges: state.currentFlow.edges.filter((edge) => edge.id !== edgeId),
        },
      };
    });
  },

  selectNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  // Update node positions from canvas (e.g., after drag) without pushing undo
  // Undo snapshot should be pushed BEFORE the drag starts, not after
  syncNodePositions: (positionUpdates: Array<{ id: string; position: { x: number; y: number } }>) => {
    set((state) => {
      if (!state.currentFlow) return state;
      return {
        currentFlow: {
          ...state.currentFlow,
          nodes: state.currentFlow.nodes.map((node) => {
            const update = positionUpdates.find((u) => u.id === node.id);
            return update ? { ...node, position: update.position } : node;
          }),
        },
      };
    });
    scheduleAutoSave(get);
  },

  duplicateNode: (nodeId: string) => {
    get().pushUndoSnapshot();
    set((state) => {
      if (!state.currentFlow) return state;
      const original = state.currentFlow.nodes.find((n) => n.id === nodeId);
      if (!original) return state;
      const newId = `${original.type}-${Date.now()}`;
      const clone = {
        ...original,
        id: newId,
        position: { x: original.position.x + 40, y: original.position.y + 40 },
        data: { ...original.data, label: `${original.data.label} (copy)` },
        selected: false,
      };
      return {
        currentFlow: {
          ...state.currentFlow,
          nodes: [...state.currentFlow.nodes, clone],
        },
        selectedNodeId: newId,
      };
    });
  },

  startExecution: async () => {
    const { currentFlow } = get();
    if (!currentFlow || get().isExecuting) return;

    // ── Validate flow before running ──
    const errors: string[] = [];
    const startNode = currentFlow.nodes.find((n) => n.type === 'start');
    if (!startNode) errors.push('No Start node found — add one to set the base URL');
    if (!startNode?.data?.baseUrl) errors.push('Start node has no Base URL');

    const httpNodes = currentFlow.nodes.filter((n) => n.type === 'http-request');
    if (httpNodes.length === 0) errors.push('No HTTP Request nodes — add at least one');
    httpNodes.forEach((n) => {
      if (!n.data?.path) errors.push(`"${n.data?.label || n.id}" has no path`);
    });

    if (currentFlow.edges.length === 0) errors.push('No connections — connect your nodes');

    if (errors.length > 0) {
      set({
        executionLog: [
          '⚠️ Flow validation failed:',
          ...errors.map((e) => `  ❌ ${e}`),
        ],
        executionResults: [],
        nodeStatuses: {},
      });
      return;
    }

    const context: ExecutionContext = {
      flowId: currentFlow.id,
      variables: { ...get().getResolvedVariables(), ...currentFlow.variables },
      results: [],
    };

    // Resolve env name for log
    const activeEnv = get().environments.find((e) => e.id === get().activeEnvironmentId);
    const envLabel = activeEnv ? ` [${activeEnv.name}]` : '';

    // Clear previous run + deselect node so execution panel shows
    set({
      executionContext: context,
      isExecuting: true,
      selectedNodeId: null,
      nodeStatuses: {},
      executionResults: [],
      executionLog: [`▶ Starting flow: ${currentFlow.name}${envLabel}`],
    });

    const engine = new ExecutionEngine(currentFlow.id, context.variables);
    _activeEngine = engine;

    try {
      await engine.executeFlow(
        currentFlow.nodes,
        currentFlow.edges,
        // onNodeUpdate — update visual status per node
        (nodeId: string, status: string) => {
          set((state) => ({
            nodeStatuses: { ...state.nodeStatuses, [nodeId]: status as any },
            executionLog: [
              ...state.executionLog,
              `${status === 'executing' ? '⏳' : status === 'success' ? '✅' : '❌'} ${
                currentFlow.nodes.find((n) => n.id === nodeId)?.data?.label || nodeId
              } → ${status}`,
            ],
          }));
        },
        // onResult — collect execution result
        (result: ExecutionResult) => {
          set((state) => ({
            executionResults: [...state.executionResults, result],
          }));
        }
      );

      set((state) => ({
        executionLog: [...state.executionLog, '🏁 Flow execution complete'],
        isExecuting: false,
      }));
      _activeEngine = null;
    } catch (error: any) {
      set((state) => ({
        executionLog: [...state.executionLog, `💥 Flow failed: ${error.message}`],
        isExecuting: false,
      }));
      _activeEngine = null;
    }
  },

  stopExecution: () => {
    if (_activeEngine) {
      _activeEngine.abort();
      _activeEngine = null;
    }
    set((state) => ({
      isExecuting: false,
      executionLog: [...state.executionLog, '⏹ Execution stopped by user'],
    }));
  },

  setNodeStatus: (nodeId: string, status) => {
    set((state) => ({
      nodeStatuses: { ...state.nodeStatuses, [nodeId]: status },
    }));
  },

  addLogEntry: (entry: string) => {
    set((state) => ({
      executionLog: [...state.executionLog, entry],
    }));
  },

  clearExecution: () => {
    set({
      nodeStatuses: {},
      executionResults: [],
      executionLog: [],
      executionContext: null,
      isExecuting: false,
    });
  },

  updateExecutionResult: (result: ExecutionResult) => {
    set((state) => ({
      executionResults: [...state.executionResults, result],
    }));
  },

  exportFlow: () => {
    const { currentFlow } = get();
    if (!currentFlow) return '';
    return JSON.stringify(currentFlow, null, 2);
  },

  importFlow: (json: string) => {
    try {
      const flow = JSON.parse(json) as FlowConfig;
      set((state) => {
        const exists = state.flows.some((f) => f.id === flow.id);
        const newFlows = exists
          ? state.flows.map((f) => (f.id === flow.id ? flow : f))
          : [...state.flows, flow];
        saveFlowsToStorage(newFlows);
        saveCurrentId(flow.id);
        return { flows: newFlows, currentFlow: flow };
      });
    } catch (error) {
      console.error('Failed to import flow:', error);
    }
  },
}));

