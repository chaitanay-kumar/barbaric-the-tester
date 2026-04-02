import React, { useRef, useState, useCallback, useEffect } from 'react';

interface ResizablePanelProps {
  children: React.ReactNode;
  side: 'left' | 'right';
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  collapsed?: boolean;
  onCollapse?: () => void;
  className?: string;
}

const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  side,
  defaultWidth,
  minWidth,
  maxWidth,
  collapsed = false,
  onCollapse,
  className = '',
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = side === 'left'
        ? e.clientX - startX.current
        : startX.current - e.clientX;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [side, minWidth, maxWidth]);

  if (collapsed) {
    return (
      <div
        className={`flex-shrink-0 bg-slate-900/95 border-blue-500/20 flex items-center justify-center cursor-pointer hover:bg-slate-800/95 transition-colors ${
          side === 'left' ? 'border-r' : 'border-l'
        }`}
        style={{ width: 32 }}
        onClick={onCollapse}
        title={side === 'left' ? 'Expand sidebar' : 'Expand panel'}
      >
        <span className="text-slate-500 text-xs" style={{ writingMode: 'vertical-rl' }}>
          {side === 'left' ? '▶ Nodes' : '◀ Panel'}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex-shrink-0 relative ${className}`} style={{ width }}>
      {children}

      {/* Resize handle */}
      <div
        className={`absolute top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-blue-500/40 active:bg-blue-500/60 transition-colors ${
          side === 'left' ? 'right-0' : 'left-0'
        }`}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};

export default ResizablePanel;

