import { useState, useRef, useCallback } from 'react';

export function useDraggable() {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef(null);
    const startPos = useRef({ x: 0, y: 0 });

    const handleMouseDown = useCallback((e) => {
        // Only allow dragging from the header/title area
        if (e.target.closest('[data-draggable-cancel]')) return;
        
        setIsDragging(true);
        startPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        e.preventDefault();
    }, [position]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;
        
        const newX = e.clientX - startPos.current.x;
        const newY = e.clientY - startPos.current.y;
        
        setPosition({ x: newX, y: newY });
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const resetPosition = useCallback(() => {
        setPosition({ x: 0, y: 0 });
    }, []);

    return {
        position,
        isDragging,
        dragRef,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        resetPosition
    };
}
