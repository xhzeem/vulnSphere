'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Minus, Square, Maximize2 } from 'lucide-react';

interface FloatingWindowProps {
    isOpen: boolean;
    onClose: () => void;
    onMinimize?: () => void;
    onMaximize?: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
    initialWidth?: number;
    initialHeight?: number;
    initialX?: number;
    initialY?: number;
    isResizable?: boolean;
    isDraggable?: boolean;
}

export function FloatingWindow({
    isOpen,
    onClose,
    onMinimize,
    onMaximize,
    title,
    children,
    className,
    initialWidth = 800,
    initialHeight = 600,
    initialX = 100,
    initialY = 100,
    isResizable = true,
    isDraggable = true,
}: FloatingWindowProps) {
    const [isMaximized, setIsMaximized] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [dimensions, setDimensions] = useState({
        width: initialWidth,
        height: initialHeight,
    });
    const [position, setPosition] = useState({
        x: initialX,
        y: initialY,
    });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDirection, setResizeDirection] = useState('');

    const windowRef = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const windowStartPos = useRef({ x: 0, y: 0 });
    const resizeStartPos = useRef({ x: 0, y: 0 });
    const resizeStartSize = useRef({ width: 0, height: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging && isDraggable) {
                const deltaX = e.clientX - dragStartPos.current.x;
                const deltaY = e.clientY - dragStartPos.current.y;
                setPosition({
                    x: windowStartPos.current.x + deltaX,
                    y: windowStartPos.current.y + deltaY,
                });
            }

            if (isResizing && isResizable) {
                const deltaX = e.clientX - resizeStartPos.current.x;
                const deltaY = e.clientY - resizeStartPos.current.y;

                let newWidth = resizeStartSize.current.width;
                let newHeight = resizeStartSize.current.height;

                if (resizeDirection.includes('right')) {
                    newWidth = Math.max(400, resizeStartSize.current.width + deltaX);
                }
                if (resizeDirection.includes('left')) {
                    newWidth = Math.max(400, resizeStartSize.current.width - deltaX);
                }
                if (resizeDirection.includes('bottom')) {
                    newHeight = Math.max(300, resizeStartSize.current.height + deltaY);
                }
                if (resizeDirection.includes('top')) {
                    newHeight = Math.max(300, resizeStartSize.current.height - deltaY);
                }

                setDimensions({ width: newWidth, height: newHeight });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
            setResizeDirection('');
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, resizeDirection, isDraggable, isResizable]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isDraggable) return;
        setIsDragging(true);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        windowStartPos.current = { ...position };
    };

    const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
        if (!isResizable) return;
        e.stopPropagation();
        setIsResizing(true);
        setResizeDirection(direction);
        resizeStartPos.current = { x: e.clientX, y: e.clientY };
        resizeStartSize.current = { ...dimensions };
    };

    const handleMinimize = () => {
        setIsMinimized(true);
        onMinimize?.();
    };

    const handleMaximize = () => {
        setIsMaximized(!isMaximized);
        if (isMaximized) {
            setDimensions({ width: initialWidth, height: initialHeight });
            setPosition({ x: initialX, y: initialY });
        } else {
            setDimensions({ width: window.innerWidth - 50, height: window.innerHeight - 100 });
            setPosition({ x: 25, y: 25 });
        }
        onMaximize?.();
    };

    if (!isOpen || isMinimized) return null;

    return (
        <div
            ref={windowRef}
            className={cn(
                "fixed bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50",
                isMaximized && "top-5 left-5 right-5 bottom-5",
                !isMaximized && "shadow-xl",
                className
            )}
            style={{
                width: isMaximized ? 'calc(100vw - 50px)' : `${dimensions.width}px`,
                height: isMaximized ? 'calc(100vh - 100px)' : `${dimensions.height}px`,
                left: isMaximized ? '25px' : `${position.x}px`,
                top: isMaximized ? '25px' : `${position.y}px`,
            }}
        >
            {/* Header */}
            <div
                className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between cursor-move"
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h3 className="text-sm font-medium text-gray-900">{title}</h3>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-200"
                        onClick={handleMinimize}
                    >
                        <Minus className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-200"
                        onClick={handleMaximize}
                    >
                        {isMaximized ? <Square className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                        onClick={onClose}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="h-full overflow-auto">
                {children}
            </div>

            {/* Resize handles */}
            {isResizable && !isMaximized && (
                <>
                    <div
                        className="absolute top-0 left-0 w-2 h-2 cursor-nw-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'top-left')}
                    />
                    <div
                        className="absolute top-0 right-0 w-2 h-2 cursor-ne-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'top-right')}
                    />
                    <div
                        className="absolute bottom-0 left-0 w-2 h-2 cursor-sw-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-left')}
                    />
                    <div
                        className="absolute bottom-0 right-0 w-2 h-2 cursor-se-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-right')}
                    />
                    <div
                        className="absolute top-0 left-2 right-2 h-1 cursor-n-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'top')}
                    />
                    <div
                        className="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
                    />
                    <div
                        className="absolute left-0 top-2 bottom-2 w-1 cursor-w-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
                    />
                    <div
                        className="absolute right-0 top-2 bottom-2 w-1 cursor-e-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
                    />
                </>
            )}
        </div>
    );
}
