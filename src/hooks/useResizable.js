import { useState, useRef, useEffect } from 'react';

/**
 * Custom hook to make elements resizable with drag handles
 * Provides width and height state management and positioning
 * Usage: const { size, isDraggingResize, handleResizeMouseDown, modalRef } = useResizable(400, 600);
 */
export function useResizable(initialWidth = 400, initialHeight = 600, minWidth = 300, minHeight = 200) {
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [isDraggingResize, setIsDraggingResize] = useState(false);
  const [activeHandle, setActiveHandle] = useState(null);
  const modalRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleResizeMouseDown = (e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDraggingResize(true);
    setActiveHandle(handle);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
  };

  useEffect(() => {
    if (!isDraggingResize) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      
      let newWidth = dragStartRef.current.width;
      let newHeight = dragStartRef.current.height;

      // Handle different resize directions
      if (activeHandle === 'right' || activeHandle === 'se') {
        newWidth = Math.max(minWidth, dragStartRef.current.width + deltaX);
      }
      if (activeHandle === 'bottom' || activeHandle === 'se') {
        newHeight = Math.max(minHeight, dragStartRef.current.height + deltaY);
      }
      if (activeHandle === 'left') {
        newWidth = Math.max(minWidth, dragStartRef.current.width - deltaX);
      }
      if (activeHandle === 'top') {
        newHeight = Math.max(minHeight, dragStartRef.current.height - deltaY);
      }

      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsDraggingResize(false);
      setActiveHandle(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingResize, activeHandle, minWidth, minHeight]);

  const resetSize = () => {
    setSize({ width: initialWidth, height: initialHeight });
  };

  return {
    size,
    isDraggingResize,
    handleResizeMouseDown,
    modalRef,
    resetSize,
  };
}
