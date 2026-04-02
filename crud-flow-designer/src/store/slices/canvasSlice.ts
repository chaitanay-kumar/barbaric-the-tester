import { StateCreator } from 'zustand';
import { Node, Edge } from 'reactflow';
import { createNode } from '../../utils/nodeUtils';

export interface CanvasSlice {
  // State
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  
  // Node actions
  addNode: (node: Node) => void;
  addNodeAtPosition: (type: string, position: { x: number; y: number }) => void;
  updateNode: (nodeId: string, data: Partial<Node['data']>) => void;
  deleteNode: (nodeId: string) => void;
  setNodes: (nodes: Node[]) => void;
  
  // Edge actions
  addEdge: (edge: Edge) => void;
  deleteEdge: (edgeId: string) => void;
  setEdges: (edges: Edge[]) => void;
  
  // Selection actions
  selectNode: (nodeId: string | null) => void;
  
  // Bulk actions
  clearCanvas: () => void;
}

export const createCanvasSlice: StateCreator<CanvasSlice> = (set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,

  addNode: (node: Node) => {
    set((state) => ({
      nodes: [...state.nodes, node],
    }));
  },

  addNodeAtPosition: (type: string, position: { x: number; y: number }) => {
    const newNode = createNode(type, position);
    set((state) => ({
      nodes: [...state.nodes, newNode],
    }));
  },

  updateNode: (nodeId: string, data: Partial<Node['data']>) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    }));
  },

  deleteNode: (nodeId: string) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    }));
  },

  setNodes: (nodes: Node[]) => {
    set({ nodes });
  },

  addEdge: (edge: Edge) => {
    set((state) => ({
      edges: [...state.edges, edge],
    }));
  },

  deleteEdge: (edgeId: string) => {
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
    }));
  },

  setEdges: (edges: Edge[]) => {
    set({ edges });
  },

  selectNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  clearCanvas: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
    });
  },
});

