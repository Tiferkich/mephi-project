/**
 * Widget Component
 * Универсальный контейнер-виджет с resize функционалом
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import 'boxicons/css/boxicons.min.css';
import './Widget.css';

const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 350;

const Widget = ({ 
    id, 
    title, 
    icon = 'bx-widget',
    type,
    children, 
    onTitleChange,
    onDelete,
    onSettings,
    isEditing = false,
    collapsed = false,
    onToggleCollapse,
    width: initialWidth,
    height: initialHeight,
    onResize
}) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState(title);
    const [size, setSize] = useState({
        width: initialWidth || DEFAULT_WIDTH,
        height: initialHeight || DEFAULT_HEIGHT
    });
    const [isResizing, setIsResizing] = useState(false);
    const widgetRef = useRef(null);
    const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

    // Handle resize start
    const handleResizeStart = useCallback((e, direction) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        startPos.current = {
            x: e.clientX,
            y: e.clientY,
            width: size.width,
            height: size.height,
            direction
        };
    }, [size]);

    // Handle resize move
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startPos.current.x;
            const deltaY = e.clientY - startPos.current.y;
            const direction = startPos.current.direction;
            
            let newWidth = startPos.current.width;
            let newHeight = startPos.current.height;
            
            if (direction.includes('e')) {
                newWidth = Math.max(MIN_WIDTH, startPos.current.width + deltaX);
            }
            if (direction.includes('s')) {
                newHeight = Math.max(MIN_HEIGHT, startPos.current.height + deltaY);
            }
            if (direction.includes('w')) {
                newWidth = Math.max(MIN_WIDTH, startPos.current.width - deltaX);
            }
            if (direction.includes('n')) {
                newHeight = Math.max(MIN_HEIGHT, startPos.current.height - deltaY);
            }
            
            setSize({ width: newWidth, height: newHeight });
        };

        const handleMouseUp = () => {
            if (isResizing) {
                setIsResizing(false);
                onResize && onResize(id, size.width, size.height);
            }
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, id, size, onResize]);

    const handleTitleSave = () => {
        if (editTitle.trim() && onTitleChange) {
            onTitleChange(id, editTitle.trim());
        }
        setIsEditingTitle(false);
    };

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleTitleSave();
        } else if (e.key === 'Escape') {
            setEditTitle(title);
            setIsEditingTitle(false);
        }
    };

    const getTypeIcon = () => {
        switch (type) {
            case 'passwords':
                return 'bx-lock-alt';
            case 'notes':
                return 'bx-note';
            case 'files':
                return 'bx-folder';
            default:
                return icon;
        }
    };

    return (
        <motion.div
            ref={widgetRef}
            className={`widget ${collapsed ? 'widget--collapsed' : ''} ${isResizing ? 'widget--resizing' : ''}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
                width: collapsed ? '100%' : size.width,
                height: collapsed ? 'auto' : size.height,
                minWidth: MIN_WIDTH,
                minHeight: collapsed ? 'auto' : MIN_HEIGHT
            }}
        >
            {/* Widget Header */}
            <div className="widget__header">
                {/* Icon */}
                <div className="widget__icon">
                    <i className={`bx ${getTypeIcon()}`}></i>
                </div>

                {/* Title */}
                {isEditingTitle ? (
                    <input
                        type="text"
                        className="widget__title-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={handleTitleSave}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            handleTitleKeyDown(e);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onFocus={(e) => e.stopPropagation()}
                        autoFocus
                    />
                ) : (
                    <h3 
                        className="widget__title"
                        onDoubleClick={() => setIsEditingTitle(true)}
                        title="Double-click to edit"
                    >
                        {title}
                    </h3>
                )}

                {/* Size indicator */}
                {!collapsed && (
                    <span className="widget__size-indicator">
                        {Math.round(size.width)} × {Math.round(size.height)}
                    </span>
                )}

                {/* Actions */}
                <div className="widget__actions">
                    <button 
                        className="widget__action-btn"
                        onClick={onToggleCollapse}
                        title={collapsed ? "Expand" : "Collapse"}
                    >
                        <i className={`bx ${collapsed ? 'bx-chevron-down' : 'bx-chevron-up'}`}></i>
                    </button>
                    
                    <button 
                        className="widget__action-btn"
                        onClick={() => setIsEditingTitle(true)}
                        title="Rename"
                    >
                        <i className='bx bx-edit-alt'></i>
                    </button>

                    {onSettings && (
                        <button 
                            className="widget__action-btn"
                            onClick={() => onSettings(id)}
                            title="Settings"
                        >
                            <i className='bx bx-cog'></i>
                        </button>
                    )}

                    {onDelete && (
                        <button 
                            className="widget__action-btn widget__action-btn--danger"
                            onClick={() => onDelete(id)}
                            title="Delete widget"
                        >
                            <i className='bx bx-trash'></i>
                        </button>
                    )}
                </div>
            </div>

            {/* Widget Content */}
            {!collapsed && (
                <div className="widget__content">
                    {children}
                </div>
            )}

            {/* Resize Handles */}
            {!collapsed && (
                <>
                    <div 
                        className="widget__resize-handle widget__resize-handle--e"
                        onMouseDown={(e) => handleResizeStart(e, 'e')}
                    />
                    <div 
                        className="widget__resize-handle widget__resize-handle--s"
                        onMouseDown={(e) => handleResizeStart(e, 's')}
                    />
                    <div 
                        className="widget__resize-handle widget__resize-handle--se"
                        onMouseDown={(e) => handleResizeStart(e, 'se')}
                    >
                        <i className='bx bx-expand-alt'></i>
                    </div>
                </>
            )}
        </motion.div>
    );
};

export default Widget;
