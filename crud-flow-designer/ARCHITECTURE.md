# 🏗️ CRUD Flow Designer - Architecture & Project Structure

## 📐 Architecture Overview

This project follows **clean architecture principles** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  (React Components - UI only, no business logic)            │
├─────────────────────────────────────────────────────────────┤
│                     Custom Hooks Layer                       │
│  (Business logic, reusable, testable)                       │
├─────────────────────────────────────────────────────────────┤
│                     State Management                         │
│  (Zustand Store - sliced by domain)                         │
├─────────────────────────────────────────────────────────────┤
│                     Service Layer                            │
│  (Core business logic, API calls, execution engine)         │
├─────────────────────────────────────────────────────────────┤
│                     Utilities & Constants                    │
│  (Pure functions, configuration, type definitions)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Complete Project Structure

```
crud-flow-designer/
│
├── src/
│   │
│   ├── components/              # 🎨 Presentation Layer
│   │   ├── nodes/               # Custom node components
│   │   │   ├── StartNode.tsx
│   │   │   ├── HttpRequestNode.tsx
│   │   │   ├── VariableExtractorNode.tsx
│   │   │   └── AssertionNode.tsx
│   │   │
│   │   ├── FlowCanvas.tsx       # Main React Flow canvas
│   │   ├── Sidebar.tsx          # Node palette
│   │   └── Toolbar.tsx          # Action controls
│   │
│   ├── hooks/                   # 🎣 Custom Hooks (Business Logic)
│   │   ├── index.ts             # Barrel export
│   │   ├── useNodeDragDrop.ts   # Drag & drop logic
│   │   ├── useFlowIO.ts         # Export/Import logic
│   │   ├── useFlowSync.ts       # State synchronization
│   │   └── useFlowExecution.ts  # Execution orchestration
│   │
│   ├── store/                   # 🗄️ State Management (Zustand)
│   │   ├── index.ts             # Combined store + selectors
│   │   ├── flowStore.ts         # LEGACY (to be removed)
│   │   └── slices/              # Modular store slices
│   │       ├── flowSlice.ts     # Flow CRUD operations
│   │       ├── canvasSlice.ts   # Node/Edge management
│   │       └── executionSlice.ts # Execution state
│   │
│   ├── services/                # 🔧 Service Layer
│   │   ├── executionEngine.ts   # Flow execution logic
│   │   ├── apiClient.ts         # (Future) Backend API calls
│   │   └── validators.ts        # (Future) Node validation
│   │
│   ├── utils/                   # 🛠️ Utility Functions
│   │   ├── nodeUtils.ts         # Node creation, validation
│   │   ├── storageUtils.ts      # LocalStorage operations
│   │   └── jsonPath.ts          # (Future) JSONPath evaluator
│   │
│   ├── constants/               # 📋 Configuration & Constants
│   │   └── index.ts             # Node types, colors, config
│   │
│   ├── types/                   # 📝 Type Definitions
│   │   └── flow.ts              # All TypeScript interfaces
│   │
│   ├── App.tsx                  # 🚀 Main App Component
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles (Tailwind)
│
├── public/                      # Static assets
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🏛️ Architectural Principles

### 1. **Separation of Concerns**
- ✅ **Components** = Presentation only (no business logic)
- ✅ **Hooks** = Business logic (reusable across components)
- ✅ **Services** = Core domain logic (execution, API calls)
- ✅ **Store** = Global state (sliced by domain)
- ✅ **Utils** = Pure functions (no side effects)

### 2. **Single Responsibility Principle**
Each module has ONE clear purpose:
- `flowSlice.ts` = Flow CRUD operations
- `canvasSlice.ts` = Node/Edge management
- `executionSlice.ts` = Execution state
- `executionEngine.ts` = Execution logic
- `storageUtils.ts` = LocalStorage operations

### 3. **Dependency Inversion**
- Components depend on **hooks**, not on stores directly
- Hooks depend on **services**, not on implementation details
- Services are **pure** and testable

### 4. **Modularity**
- Each hook is **independently usable**
- Each store slice can be **tested separately**
- Each service has **no external dependencies** (except utilities)

---

## 🔄 Data Flow

### User Interaction → State Update

```
User drags node
    ↓
useNodeDragDrop() hook
    ↓
createNode() utility
    ↓
addNode() action (canvasSlice)
    ↓
Zustand store updates
    ↓
React Flow re-renders
```

### Flow Execution

```
User clicks "Run"
    ↓
useFlowExecution() hook
    ↓
ExecutionEngine service
    ↓
Sequential HTTP calls
    ↓
updateNodeStatus() (executionSlice)
    ↓
Node component updates (visual feedback)
    ↓
addExecutionResult() (executionSlice)
```

### Export/Import

```
User clicks "Export"
    ↓
useFlowIO() hook
    ↓
exportFlowAsJson() utility
    ↓
JSON.stringify(currentFlow)
    ↓
Display in modal
```

---

## 🗄️ State Management Architecture

### Zustand Store Slices

#### **FlowSlice** (Flow-level operations)
```typescript
{
  flows: FlowConfig[],              // All flows
  currentFlow: FlowConfig | null,   // Active flow
  createFlow(),                      // Create new
  loadFlow(),                        // Load existing
  updateFlow(),                      // Update current
  deleteFlow()                       // Delete by ID
}
```

#### **CanvasSlice** (Canvas-level operations)
```typescript
{
  nodes: Node[],                     // React Flow nodes
  edges: Edge[],                     // React Flow edges
  selectedNodeId: string | null,    // Current selection
  addNode(),                         // Add to canvas
  updateNode(),                      // Modify node data
  deleteNode(),                      // Remove + cleanup edges
  addEdge(),                         // Connect nodes
  deleteEdge(),                      // Disconnect nodes
  clearCanvas()                      // Reset canvas
}
```

#### **ExecutionSlice** (Execution-level operations)
```typescript
{
  executionContext: ExecutionContext | null,  // Current run
  isExecuting: boolean,                       // Running state
  executionResults: Map<string, Result>,      // Results by node
  startExecution(),                           // Begin run
  stopExecution(),                            // Abort run
  addExecutionResult(),                       // Store result
  setVariable(),                              // Store extracted var
  getVariable()                               // Retrieve var
}
```

### Why Slices?

- ✅ **Better performance** - Only re-render affected components
- ✅ **Easier testing** - Test each slice independently
- ✅ **Clear boundaries** - Each slice owns its domain
- ✅ **Scalability** - Easy to add new slices (e.g., `uiSlice`, `templateSlice`)

---

## 🎣 Custom Hooks Pattern

### Why Hooks?

Hooks encapsulate **business logic** and make components **dumb presenters**.

#### **useNodeDragDrop**
**Purpose:** Handle drag-and-drop interactions  
**Used by:** App.tsx, Sidebar.tsx  
**Benefits:**
- Reusable across components
- Centralizes drag logic
- Easy to test

#### **useFlowIO**
**Purpose:** Handle export/import operations  
**Used by:** Toolbar.tsx  
**Benefits:**
- Abstracts file operations
- Handles JSON validation
- Provides clean API

#### **useFlowExecution**
**Purpose:** Orchestrate flow execution  
**Used by:** Toolbar.tsx  
**Benefits:**
- Manages execution lifecycle
- Handles errors gracefully
- Updates node status

#### **useFlowSync**
**Purpose:** Sync canvas ↔ store state  
**Used by:** FlowCanvas.tsx  
**Benefits:**
- Prevents state desync
- Auto-saves changes
- Debouncing (future)

---

## 🔧 Service Layer

### ExecutionEngine

**Location:** `src/services/executionEngine.ts`

**Responsibilities:**
1. Execute nodes sequentially
2. Build execution order (topological sort)
3. Make HTTP requests
4. Extract variables (JSONPath)
5. Validate assertions
6. Handle errors & retries

**Key Methods:**
```typescript
executeFlow(nodes, edges, onUpdate, onResult)
executeNode(node)
executeHttpRequest(node, result)
executeVariableExtractor(node, result)
executeAssertion(node, result)
buildExecutionOrder(nodes, edges, startNodeId)
substituteVariables(input)
evaluateJsonPath(data, path)
```

**Why separate service?**
- ✅ **Testable** - Pure logic, no React dependencies
- ✅ **Reusable** - Can be used in backend too
- ✅ **Maintainable** - Single place for execution logic

---

## 🛠️ Utilities

### nodeUtils.ts
**Purpose:** Node creation and validation  
**Functions:**
- `generateNodeId()` - Unique ID generation
- `createNode()` - Factory for nodes with defaults
- `validateNodeData()` - Type-specific validation
- `getNodeDisplayName()` - Human-readable names

### storageUtils.ts
**Purpose:** LocalStorage operations  
**Functions:**
- `saveFlowToStorage()` - Persist flow
- `loadFlowFromStorage()` - Retrieve flow
- `exportFlowAsJson()` - Serialize to JSON
- `importFlowFromJson()` - Parse & validate
- `downloadFlowAsFile()` - Browser download

---

## 📝 Type System

### Core Types (src/types/flow.ts)

```typescript
// Flow configuration
interface FlowConfig {
  id: string;
  name: string;
  version: string;
  nodes: Node[];
  edges: Edge[];
  variables: Record<string, any>;
}

// Node data interfaces (one per node type)
interface HttpRequestNodeData {
  label: string;
  method: HTTPMethod;
  path: string;
  headers?: Record<string, string>;
  body?: any;
}

// Execution tracking
interface ExecutionResult {
  nodeId: string;
  status: ExecutionStatus;
  request?: {...};
  response?: {...};
  error?: string;
}
```

---

## 🎯 Component Responsibilities

### App.tsx
- Initialize default flow
- Handle drag-and-drop container
- Compose Toolbar + Sidebar + Canvas
- **NO business logic**

### Toolbar.tsx
- Display flow info
- Trigger actions (Run, Save, Export)
- Use hooks for logic: `useFlowIO()`, `useFlowExecution()`
- **NO direct store access**

### Sidebar.tsx
- Display node palette
- Enable drag start
- Use hook: `useNodeDragDrop()`
- **NO state mutations**

### FlowCanvas.tsx
- Render React Flow canvas
- Handle node/edge changes
- Sync with store via `useFlowSync()`
- **Minimal logic**

### Node Components
- Display node data
- Visual status indicators
- **100% presentational** (data passed via props)

---

## 🚀 Scalability Features

### 1. **Easy to Add New Node Types**
```typescript
// 1. Add constant
export const NODE_TYPES = {
  ...existing,
  MY_NEW_NODE: 'my-new-node',
};

// 2. Create component
// src/components/nodes/MyNewNode.tsx

// 3. Add to nodeTypes in FlowCanvas.tsx

// 4. Add default data in constants
```

### 2. **Easy to Add New Features**
```typescript
// Add new store slice
// src/store/slices/templateSlice.ts

export interface TemplateSlice {
  templates: Template[];
  createTemplate();
  applyTemplate();
}

// Combine in src/store/index.ts
export type AppStore = FlowSlice & CanvasSlice & ExecutionSlice & TemplateSlice;
```

### 3. **Easy to Test**
```typescript
// Test hooks independently
import { renderHook } from '@testing-library/react-hooks';
import { useFlowExecution } from './useFlowExecution';

test('starts execution', () => {
  const { result } = renderHook(() => useFlowExecution());
  act(() => result.current.executeFlow());
  expect(result.current.isExecuting).toBe(true);
});
```

---

## 🔐 Best Practices Implemented

### ✅ **TypeScript Strict Mode**
- All functions typed
- No `any` types (except React Flow instance - will fix)
- Interfaces for all data structures

### ✅ **Immutable State Updates**
- Zustand ensures immutability
- No direct state mutations
- New objects on every update

### ✅ **Single Source of Truth**
- Store is the **only** source of truth
- Components read from store via selectors
- No local component state for shared data

### ✅ **Performance Optimizations**
- `useMemo` for node types
- `useCallback` for event handlers
- Zustand selectors prevent unnecessary re-renders

### ✅ **Error Handling**
- Try-catch in all async operations
- User-friendly error messages
- Graceful degradation

### ✅ **Code Organization**
- Barrel exports (`index.ts`) for clean imports
- Consistent naming conventions
- Clear file structure

---

## 📊 Import/Export Flow

### Clean Imports via Barrel Exports

```typescript
// ❌ Before (messy)
import { useFlowSync } from '../hooks/useFlowSync';
import { useFlowIO } from '../hooks/useFlowIO';
import { useFlowExecution } from '../hooks/useFlowExecution';

// ✅ After (clean)
import { useFlowSync, useFlowIO, useFlowExecution } from '../hooks';
```

### Store Selectors for Performance

```typescript
// ❌ Bad (re-renders on any store change)
const store = useAppStore();

// ✅ Good (only re-renders when specific data changes)
const currentFlow = useAppStore((state) => state.currentFlow);
const nodes = useAppStore((state) => state.nodes);
```

---

## 🔄 State Synchronization Strategy

### Problem: React Flow vs Store State

React Flow has its own internal state, but we need to persist to our store.

### Solution: Bidirectional Sync with `useFlowSync`

```typescript
// Canvas → Store (when nodes/edges change)
useEffect(() => {
  if (currentFlow) {
    updateFlow({ nodes, edges });
  }
}, [nodes, edges]);

// Store → Canvas (when flow changes)
useEffect(() => {
  if (currentFlow) {
    setNodes(currentFlow.nodes);
    setEdges(currentFlow.edges);
  }
}, [currentFlow?.id]);
```

**Key insight:** Only sync on `currentFlow.id` change, not on every node/edge mutation (prevents infinite loops).

---

## 🎨 Design System

### Color Palette

```typescript
const COLORS = {
  background: 'slate-900',      // #0f172a
  surface: 'slate-800',         // #1e293b
  primary: 'blue-500',          // #3b82f6
  success: 'emerald-500',       // #10b981
  error: 'red-500',             // #ef4444
  warning: 'yellow-500',        // #eab308
  info: 'cyan-500',             // #06b6d4
};
```

### Node Color Mapping

```typescript
const NODE_COLORS = {
  'start': '#3b82f6',           // Blue
  'http-request': '#10b981',    // Emerald
  'variable-extractor': '#a855f7', // Purple
  'assertion': '#22c55e',       // Green
  'delay': '#f59e0b',           // Amber
  'conditional': '#f97316',     // Orange
  'loop': '#ec4899',            // Pink
  'script': '#6366f1',          // Indigo
  'parallel': '#14b8a6',        // Teal
};
```

---

## 📦 Dependencies & Their Purpose

### Production Dependencies
```json
{
  "react": "UI library",
  "react-dom": "DOM rendering",
  "reactflow": "Visual node editor",
  "zustand": "State management",
  "axios": "HTTP client for execution",
  "lucide-react": "Icon library",
  "clsx": "Conditional className utility",
  "immer": "Immutable state updates"
}
```

### Dev Dependencies
```json
{
  "@vitejs/plugin-react": "Vite React support",
  "typescript": "Type safety",
  "tailwindcss": "Utility-first CSS",
  "autoprefixer": "CSS vendor prefixes",
  "postcss": "CSS processing",
  "eslint": "Code linting"
}
```

---

## 🔍 File Responsibilities Matrix

| File | Layer | Responsibility | Dependencies |
|------|-------|----------------|--------------|
| `App.tsx` | Presentation | App layout | Components, hooks |
| `Toolbar.tsx` | Presentation | Action buttons | Hooks |
| `Sidebar.tsx` | Presentation | Node palette | Hooks |
| `FlowCanvas.tsx` | Presentation | Canvas renderer | Hooks, store selectors |
| `StartNode.tsx` | Presentation | Node UI | Types |
| `useFlowExecution.ts` | Business Logic | Execution orchestration | Store, services |
| `useFlowIO.ts` | Business Logic | Export/import | Utils |
| `useNodeDragDrop.ts` | Business Logic | Drag-drop logic | Store, utils |
| `useFlowSync.ts` | Business Logic | State sync | Store |
| `flowSlice.ts` | State | Flow CRUD | Utils |
| `canvasSlice.ts` | State | Node/edge ops | Utils |
| `executionSlice.ts` | State | Execution state | Constants |
| `executionEngine.ts` | Service | Core execution | Axios, utils |
| `nodeUtils.ts` | Utility | Node helpers | Constants |
| `storageUtils.ts` | Utility | Storage ops | Types |
| `constants/index.ts` | Config | Constants | None |
| `types/flow.ts` | Types | Interfaces | React Flow |

---

## 🧪 Testing Strategy (Future)

### Unit Tests
```typescript
// Test utilities (pure functions)
describe('nodeUtils', () => {
  test('generateNodeId creates unique IDs', () => {
    const id1 = generateNodeId('http-request');
    const id2 = generateNodeId('http-request');
    expect(id1).not.toBe(id2);
  });
});

// Test hooks
describe('useFlowExecution', () => {
  test('starts execution correctly', async () => {
    const { result } = renderHook(() => useFlowExecution());
    await act(() => result.current.executeFlow());
    expect(result.current.isExecuting).toBe(true);
  });
});
```

### Integration Tests
```typescript
// Test complete flows
describe('Flow Execution', () => {
  test('executes simple GET request', async () => {
    const engine = new ExecutionEngine('test-flow');
    const result = await engine.executeFlow(nodes, edges, ...);
    expect(result.length).toBe(2);
  });
});
```

---

## 📈 Performance Considerations

### 1. **Selector-Based Re-renders**
```typescript
// ❌ Re-renders on ANY store change
const store = useAppStore();

// ✅ Only re-renders when currentFlow changes
const currentFlow = useAppStore((state) => state.currentFlow);
```

### 2. **Memoization**
```typescript
// Node types memoized
const nodeTypes = useMemo(() => ({...}), []);

// Callbacks memoized
const onConnect = useCallback((params) => {...}, [setEdges]);
```

### 3. **Lazy Loading** (Future)
```typescript
// Code-split heavy components
const NodeEditor = lazy(() => import('./components/NodeEditor'));
```

---

## 🔮 Future Enhancements

### Phase 2: Core Features
1. **Node Property Editor** (Right panel)
   - File: `src/components/NodeEditor.tsx`
   - Hook: `useNodeEditor.ts`
   
2. **Variables Panel** (Bottom panel)
   - File: `src/components/VariablesPanel.tsx`
   - Shows extracted variables during execution

3. **Execution History**
   - Slice: `historySlice.ts`
   - Component: `ExecutionHistory.tsx`

### Phase 3: Backend Integration
1. **API Service**
   - File: `src/services/apiClient.ts`
   - Endpoints: Save flow, Load flows, Execute server-side

2. **Auth Integration**
   - Hook: `useAuth.ts`
   - Service: `authService.ts`

### Phase 4: Advanced Features
1. **Template Library**
   - Slice: `templateSlice.ts`
   - Component: `TemplateLibrary.tsx`

2. **OpenAPI Import**
   - Service: `openApiImporter.ts`
   - Hook: `useOpenApiImport.ts`

---

## 🎓 Development Guidelines

### Adding a New Component

1. Create in `src/components/`
2. Use hooks for logic, not direct store access
3. Keep it presentational (no business logic)
4. Export from component directory if needed

### Adding a New Hook

1. Create in `src/hooks/`
2. Name: `use` + `Feature` + `Action`
3. Add to `src/hooks/index.ts` barrel export
4. Document purpose and usage

### Adding a New Store Slice

1. Create in `src/store/slices/`
2. Define interface with state + actions
3. Use `StateCreator` type
4. Combine in `src/store/index.ts`

### Adding a New Service

1. Create in `src/services/`
2. Export class or functions
3. Keep it pure (no React dependencies)
4. Add tests

---

## ✅ Code Quality Checklist

- ✅ **TypeScript strict mode** enabled
- ✅ **ESLint** configured
- ✅ **No `any` types** (except necessary cases)
- ✅ **Consistent naming** (camelCase, PascalCase)
- ✅ **Clear file organization**
- ✅ **Documented interfaces**
- ✅ **Single responsibility** per file
- ✅ **Dependency injection** ready

---

## 🎉 Architecture Benefits

### Maintainability
- ✅ Easy to find code (clear structure)
- ✅ Easy to modify (isolated changes)
- ✅ Easy to extend (add new slices/hooks)

### Testability
- ✅ Hooks can be tested with `renderHook`
- ✅ Services are pure functions
- ✅ Components are presentational

### Scalability
- ✅ Can add features without refactoring
- ✅ Can split into micro-frontends
- ✅ Can migrate to backend execution

### Developer Experience
- ✅ Clean imports via barrel exports
- ✅ TypeScript autocomplete everywhere
- ✅ Fast HMR with Vite
- ✅ Clear separation of concerns

---

**This architecture is production-ready and follows React + TypeScript best practices!** 🚀

