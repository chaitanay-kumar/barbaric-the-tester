import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  BackgroundVariant,
  NodeTypes,
  ReactFlowInstance,
  EdgeTypes,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
} from 'reactflow';
import { createPortal } from 'react-dom';
import 'reactflow/dist/style.css';

import StartNode from './nodes/StartNode';
import HttpRequestNode from './nodes/HttpRequestNode';
import VariableExtractorNode from './nodes/VariableExtractorNode';
import AssertionNode from './nodes/AssertionNode';
import DelayNode from './nodes/DelayNode';
import ConditionalNode from './nodes/ConditionalNode';
import LoopNode from './nodes/LoopNode';
import ScriptNode from './nodes/ScriptNode';
import ParallelNode from './nodes/ParallelNode';

import { useFlowStore } from '../store/flowStore';

// ── Global edge hover state with delayed leave ──
let _hoveredEdgeId: string | null = null;
let _hoverLeaveTimer: ReturnType<typeof setTimeout> | null = null;
const _hoverListeners = new Set<() => void>();

function setHoveredEdge(id: string | null, immediate = false) {
  // Clear any pending leave
  if (_hoverLeaveTimer) { clearTimeout(_hoverLeaveTimer); _hoverLeaveTimer = null; }

  if (id !== null) {
    // Enter — always immediate
    _hoveredEdgeId = id;
    _hoverListeners.forEach((fn) => fn());
  } else if (immediate) {
    // Immediate clear (e.g. after delete)
    _hoveredEdgeId = null;
    _hoverListeners.forEach((fn) => fn());
  } else {
    // Delayed leave — keeps button visible so user can reach it
    _hoverLeaveTimer = setTimeout(() => {
      _hoveredEdgeId = null;
      _hoverListeners.forEach((fn) => fn());
    }, 600);
  }
}

function useHoveredEdge(edgeId: string): boolean {
  const [isHovered, setIsHovered] = React.useState(_hoveredEdgeId === edgeId);
  React.useEffect(() => {
    const listener = () => setIsHovered(_hoveredEdgeId === edgeId);
    _hoverListeners.add(listener);
    return () => { _hoverListeners.delete(listener); };
  }, [edgeId]);
  return isHovered;
}

// ── Custom edge with delete button on hover ──
function DeletableEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd }: any) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const hovered = useHoveredEdge(id);

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    useFlowStore.getState().pushUndoSnapshot();
    setHoveredEdge(null, true); // immediate clear
    setEdges((eds) => eds.filter((edge) => edge.id !== id));
  };

  return (
    <>
      {/* Wide invisible interaction zone */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={30}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setHoveredEdge(id)}
        onMouseLeave={() => setHoveredEdge(null)}
        onClick={onDelete}
      />
      {/* Visible edge line */}
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{
        ...style,
        stroke: hovered ? '#3b82f6' : (style?.stroke || '#64748b'),
        strokeWidth: hovered ? 3 : 2,
        transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
      }} />
      {/* Delete button — always in DOM, smooth fade in/out */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: hovered ? 'all' : 'none',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
          onMouseEnter={() => setHoveredEdge(id)}
          onMouseLeave={() => setHoveredEdge(null)}
        >
          <button
            className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow-lg shadow-red-500/50 cursor-pointer border-2 border-white transition-transform hover:scale-110"
            onClick={onDelete}
            title="Delete connection"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes: EdgeTypes = {
  deletable: DeletableEdge,
};

// ── Context menu types ──
interface ContextMenu {
  x: number;
  y: number;
  nodeId?: string;
  edgeId?: string;
}

// ── Connection validation rules ──
const NODES_WITHOUT_TARGET = ['start']; // Start only has source
const NODES_WITHOUT_SOURCE: string[] = []; // All nodes can output

function getDefaultNodeData(type: string) {
  switch (type) {
    case 'start':
      return { label: 'Start', baseUrl: 'https://api.example.com', auth: { type: 'none' } };
    case 'http-request':
      return { label: 'New Request', method: 'GET', path: '/endpoint', headers: {} };
    case 'variable-extractor':
      return { label: 'Extract Variable', jsonPath: '$.id', variableName: 'myVariable', source: 'body' };
    case 'assertion':
      return { label: 'Validate Response', assertions: [{ type: 'status_code', expected: 200 }] };
    case 'delay':
      return { label: 'Wait', milliseconds: 1000 };
    case 'conditional':
      return { label: 'If Condition', condition: '$.status', operator: '==', value: 'success' };
    case 'loop':
      return { label: 'For Each', arrayPath: '$.items', maxIterations: 100 };
    case 'script':
      return { label: 'Custom Script', script: '// Your JavaScript code here\nreturn { success: true };' };
    case 'parallel':
      return { label: 'Run in Parallel', maxConcurrent: 5 };
    default:
      return { label: 'Unknown Node' };
  }
}

const nodeTypes: NodeTypes = {
  start: StartNode,
  'http-request': HttpRequestNode,
  'variable-extractor': VariableExtractorNode,
  assertion: AssertionNode,
  delay: DelayNode,
  conditional: ConditionalNode,
  loop: LoopNode,
  script: ScriptNode,
  parallel: ParallelNode,
};

const FlowCanvas: React.FC = () => {
  const currentFlow = useFlowStore((s) => s.currentFlow);
  const updateFlowConfig = useFlowStore((s) => s.updateFlowConfig);
  const nodeStatuses = useFlowStore((s) => s.nodeStatuses);
  const selectNode = useFlowStore((s) => s.selectNode);
  const storeDeleteNode = useFlowStore((s) => s.deleteNode);
  const storeSyncPositions = useFlowStore((s) => s.syncNodePositions);

  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const lastFlowId = useRef<string | null>(null);
  const isStatusUpdate = useRef(false);

  // Ensure every edge has deletable type + arrow marker
  const normalizeEdges = useCallback((rawEdges: Edge[]): Edge[] =>
    rawEdges.map((e) => ({
      ...e,
      type: 'deletable',
      animated: e.animated !== false,
      markerEnd: e.markerEnd || { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#64748b' },
    })),
  []);

  const [nodes, setNodes, onNodesChange] = useNodesState(currentFlow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(normalizeEdges(currentFlow?.edges || []));
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  // ── Flow switch: only reset when a DIFFERENT flow is loaded ──
  React.useEffect(() => {
    if (currentFlow && currentFlow.id !== lastFlowId.current) {
      lastFlowId.current = currentFlow.id;
      setNodes(currentFlow.nodes);
      setEdges(normalizeEdges(currentFlow.edges));
    }
  }, [currentFlow?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Visual status: apply ring classes without persisting to store ──
  React.useEffect(() => {
    isStatusUpdate.current = true; // flag so persist effect skips
    setNodes((nds) =>
      nds.map((node) => {
        const status = nodeStatuses[node.id];
        const cls =
          status === 'executing' ? 'ring-2 ring-blue-400 ring-offset-2 animate-pulse'
          : status === 'success' ? 'ring-2 ring-green-500 ring-offset-2'
          : status === 'error'   ? 'ring-2 ring-red-500 ring-offset-2'
          : '';
        return node.className === cls ? node : { ...node, className: cls };
      })
    );
  }, [nodeStatuses, setNodes]);

  // ── Persist local nodes/edges → store (skip if caused by status/data update) ──
  const updateRef = useRef(updateFlowConfig);
  updateRef.current = updateFlowConfig;
  const isSyncUpdate = useRef(false);

  React.useEffect(() => {
    if (!lastFlowId.current) return;
    if (isStatusUpdate.current) {
      isStatusUpdate.current = false;
      return;
    }
    if (isSyncUpdate.current) {
      isSyncUpdate.current = false;
      return;
    }
    updateRef.current({ nodes, edges });
  }, [nodes, edges]);

  // ── Sync store → canvas (handles property edits, duplicate, delete, undo/redo from store) ──
  const storeNodes = currentFlow?.nodes;
  const storeEdges = currentFlow?.edges;
  React.useEffect(() => {
    if (!storeNodes || !lastFlowId.current) return;
    isSyncUpdate.current = true;
    setNodes((localNodes) => {
      const localMap = new Map(localNodes.map((n) => [n.id, n]));
      const storeIds = new Set(storeNodes.map((n) => n.id));

      // Update existing — sync data AND position from store
      const updated = localNodes
        .filter((ln) => storeIds.has(ln.id))
        .map((ln) => {
          const sn = storeNodes.find((s) => s.id === ln.id)!;
          const dataChanged = ln.data !== sn.data;
          const posChanged = ln.position.x !== sn.position.x || ln.position.y !== sn.position.y;
          if (!dataChanged && !posChanged) return ln;
          return { ...ln, data: sn.data, position: sn.position };
        });

      // Add new nodes from store (e.g. duplicated, undo re-added)
      const localIds = new Set(localNodes.map((n) => n.id));
      const added = storeNodes.filter((sn) => !localIds.has(sn.id));

      return [...updated, ...added];
    });
  }, [storeNodes, setNodes]);

  React.useEffect(() => {
    if (!storeEdges || !lastFlowId.current) return;
    isSyncUpdate.current = true;
    setEdges(normalizeEdges(storeEdges));
  }, [storeEdges, setEdges, normalizeEdges]);

  // ── Handlers ──

  // Validate connections: no self-loops, no duplicates, no connecting to Start's target
  const isValidConnection = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return false;
    // No self-connections
    if (connection.source === connection.target) return false;
    // No duplicate edges
    const duplicate = edges.some(
      (e) => e.source === connection.source && e.target === connection.target
    );
    if (duplicate) return false;
    // Don't connect INTO a Start node
    const targetNode = nodes.find((n) => n.id === connection.target);
    if (targetNode && NODES_WITHOUT_TARGET.includes(targetNode.type || '')) return false;
    return true;
  }, [edges, nodes]);

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      useFlowStore.getState().pushUndoSnapshot();
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'deletable',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#64748b' },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  // Context menu
  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: any) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
  }, []);

  const onEdgeContextMenu = useCallback((e: React.MouseEvent, edge: Edge) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, edgeId: edge.id });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/reactflow');
      if (!type || !rfInstance.current) return;

      const position = rfInstance.current.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      // Push undo snapshot before adding
      useFlowStore.getState().pushUndoSnapshot();

      setNodes((nds) => [
        ...nds,
        { id: `${type}-${Date.now()}`, type, position, data: getDefaultNodeData(type) },
      ]);
    },
    [setNodes],
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    rfInstance.current = instance;
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: any) => {
    selectNode(node.id);
  }, [selectNode]);

  const onPaneClick = useCallback(() => {
    selectNode(null);
    setContextMenu(null);
  }, [selectNode]);

  // ── Drag start: push undo snapshot BEFORE positions change (Layer 1) ──
  const onNodeDragStart = useCallback(() => {
    useFlowStore.getState().pushUndoSnapshot();
  }, []);

  // ── Drag stop: sync final positions to store ──
  const onNodeDragStop = useCallback((_: React.MouseEvent, node: any) => {
    // After drag ends, sync ALL current node positions from local state to store
    // This ensures store has the latest positions for undo/redo
    const currentNodes = rfInstance.current?.getNodes();
    if (currentNodes) {
      const positionUpdates = currentNodes.map((n: any) => ({
        id: n.id,
        position: n.position,
      }));
      storeSyncPositions(positionUpdates);
    }
  }, [storeSyncPositions]);

  // Disconnect all edges from a node
  const disconnectNode = useCallback((nodeId: string) => {
    useFlowStore.getState().pushUndoSnapshot();
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setEdges]);

  // Delete a single edge
  const deleteEdge = useCallback((edgeId: string) => {
    useFlowStore.getState().pushUndoSnapshot();
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
  }, [setEdges]);

  // ── Delete selected nodes/edges with Backspace or Delete key ──
  const onNodesDelete = useCallback((deleted: any[]) => {
    useFlowStore.getState().pushUndoSnapshot();
    deleted.forEach((n) => {
      if (n.id === useFlowStore.getState().selectedNodeId) {
        selectNode(null);
      }
    });
  }, [selectNode]);

  const onEdgesDelete = useCallback(() => {
    useFlowStore.getState().pushUndoSnapshot();
  }, []);

  // ── Keyboard shortcuts ──
  const duplicateNode = useFlowStore((s) => s.duplicateNode);
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs/textareas
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const selectedId = useFlowStore.getState().selectedNodeId;
      // Ctrl+D / Cmd+D → duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedId) {
        e.preventDefault();
        duplicateNode(selectedId);
      }
      // Ctrl+Z → undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Shift+Z or Ctrl+Y → redo
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        redo();
      }
      // Escape → deselect
      if (e.key === 'Escape') {
        selectNode(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [duplicateNode, selectNode, undo, redo]);

  // ── Empty state ──
  if (!currentFlow) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Flow Selected</h3>
          <p className="text-gray-500">Create or load a flow to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onInit={onInit}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        deleteKeyCode={['Backspace', 'Delete']}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: 'deletable',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#64748b' },
        }}
        connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
        fitView
        attributionPosition="bottom-left"
        snapToGrid
        snapGrid={[15, 15]}
      >
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'start': return '#3b82f6';
              case 'http-request': return '#10b981';
              case 'variable-extractor': return '#a855f7';
              case 'assertion': return '#22c55e';
              case 'delay': return '#eab308';
              case 'conditional': return '#f97316';
              case 'loop': return '#ec4899';
              case 'script': return '#6366f1';
              case 'parallel': return '#14b8a6';
              default: return '#6b7280';
            }
          }}
          maskColor="rgb(240, 240, 240, 0.6)"
        />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>

      {/* Context menu */}
      {contextMenu && createPortal(
        <div
          className="fixed inset-0"
          onClick={closeContextMenu}
          onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }}
        >
          <div
            className="fixed bg-slate-800 border border-slate-600 rounded-lg shadow-2xl py-1 min-w-[160px] text-sm"
            style={{ left: contextMenu.x, top: contextMenu.y, zIndex: 9999 }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.nodeId && (
              <>
                <CtxItem
                  label="Edit Properties"
                  shortcut="Click"
                  onClick={() => { selectNode(contextMenu.nodeId!); closeContextMenu(); }}
                />
                <CtxItem
                  label="Duplicate"
                  shortcut="⌘D"
                  onClick={() => { duplicateNode(contextMenu.nodeId!); closeContextMenu(); }}
                />
                <CtxItem
                  label="Disconnect All"
                  onClick={() => { disconnectNode(contextMenu.nodeId!); closeContextMenu(); }}
                />
                <div className="border-t border-slate-700 my-1" />
                <CtxItem
                  label="Delete"
                  shortcut="⌫"
                  danger
                  onClick={() => {
                    storeDeleteNode(contextMenu.nodeId!);
                    closeContextMenu();
                  }}
                />
              </>
            )}
            {contextMenu.edgeId && (
              <CtxItem
                label="Delete Connection"
                danger
                onClick={() => { deleteEdge(contextMenu.edgeId!); closeContextMenu(); }}
              />
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Context menu item
const CtxItem: React.FC<{
  label: string;
  shortcut?: string;
  danger?: boolean;
  onClick: () => void;
}> = ({ label, shortcut, danger, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition-colors ${
      danger
        ? 'text-red-400 hover:bg-red-500/20'
        : 'text-slate-300 hover:bg-slate-700'
    }`}
  >
    <span>{label}</span>
    {shortcut && <span className="text-slate-500 ml-4">{shortcut}</span>}
  </button>
);

export default FlowCanvas;

