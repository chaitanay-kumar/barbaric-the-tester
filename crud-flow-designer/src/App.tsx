import React, { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import FlowCanvas from './components/FlowCanvas';
import ExecutionPanel from './components/ExecutionPanel';
import NodePropertyEditor from './components/NodePropertyEditor';
import ResizablePanel from './components/ResizablePanel';
import { useFlowStore } from './store/flowStore';
import { getDemoCrudFlow } from './constants/demoFlow';

function App() {
  const { currentFlow, loadFlow } = useFlowStore();
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Load demo CRUD flow on first mount (only if nothing saved)
  React.useEffect(() => {
    if (!currentFlow) {
      loadFlow(getDemoCrudFlow());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasRightPanel = selectedNodeId || useFlowStore.getState().executionLog.length > 0 || useFlowStore.getState().executionResults.length > 0;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Toolbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Node palette (resizable + collapsible) */}
        <ResizablePanel
          side="left"
          defaultWidth={256}
          minWidth={180}
          maxWidth={400}
          collapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <Sidebar onCollapse={() => setSidebarCollapsed(true)} />
        </ResizablePanel>

        {/* Center: Canvas */}
        <div className="flex-1 min-w-0">
          <ReactFlowProvider>
            <FlowCanvas />
          </ReactFlowProvider>
        </div>

        {/* Right: Property editor / Execution panel (resizable + collapsible) */}
        {hasRightPanel && (
          <ResizablePanel
            side="right"
            defaultWidth={384}
            minWidth={280}
            maxWidth={600}
            collapsed={rightCollapsed}
            onCollapse={() => setRightCollapsed(!rightCollapsed)}
          >
            {selectedNodeId ? <NodePropertyEditor /> : <ExecutionPanel />}
          </ResizablePanel>
        )}
      </div>
    </div>
  );
}


export default App;

