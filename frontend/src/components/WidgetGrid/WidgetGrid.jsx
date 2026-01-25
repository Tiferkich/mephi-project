/**
 * WidgetGrid Component
 * Сетка виджетов (упрощенная версия без drag-and-drop)
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import 'boxicons/css/boxicons.min.css';
import './WidgetGrid.css';

const WidgetGrid = ({ 
    children, 
    widgets, 
    onReorder,
    onCreateWidget 
}) => {
    return (
        <div className="widget-grid">
            <div className="widget-grid__container">
                <AnimatePresence mode="popLayout">
                    {children}
                </AnimatePresence>
                
                {/* Add Widget Button */}
                <motion.button
                    className="widget-grid__add-btn"
                    onClick={onCreateWidget}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <i className='bx bx-plus'></i>
                    <span>Create Widget</span>
                </motion.button>
            </div>
        </div>
    );
};

export default WidgetGrid;
