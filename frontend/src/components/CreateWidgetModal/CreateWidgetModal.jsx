/**
 * CreateWidgetModal Component
 * Модальное окно для создания нового виджета
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import 'boxicons/css/boxicons.min.css';
import './CreateWidgetModal.css';

const WIDGET_TYPES = [
    {
        type: 'passwords',
        icon: 'bx-lock-alt',
        title: 'Passwords',
        description: 'Store and manage passwords securely'
    },
    {
        type: 'notes',
        icon: 'bx-note',
        title: 'Notes',
        description: 'Create encrypted notes'
    },
    {
        type: 'files',
        icon: 'bx-folder',
        title: 'Files',
        description: 'Store encrypted files'
    }
];

const CreateWidgetModal = ({ isOpen, onClose, onCreate }) => {
    const [selectedType, setSelectedType] = useState(null);
    const [widgetName, setWidgetName] = useState('');
    const [step, setStep] = useState(1);

    const handleTypeSelect = (type) => {
        setSelectedType(type);
        const defaultName = WIDGET_TYPES.find(w => w.type === type)?.title || 'New Widget';
        setWidgetName(defaultName);
        setStep(2);
    };

    const handleCreate = () => {
        if (selectedType && widgetName.trim()) {
            onCreate({
                type: selectedType,
                title: widgetName.trim()
            });
            handleClose();
        }
    };

    const handleClose = () => {
        setSelectedType(null);
        setWidgetName('');
        setStep(1);
        onClose();
    };

    const handleBack = () => {
        setStep(1);
        setSelectedType(null);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                className="create-widget-modal__overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClose}
            >
                <motion.div 
                    className="create-widget-modal"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="create-widget-modal__header">
                        {step === 2 && (
                            <button 
                                className="create-widget-modal__back-btn"
                                onClick={handleBack}
                            >
                                <i className='bx bx-arrow-back'></i>
                            </button>
                        )}
                        <h2 className="create-widget-modal__title">
                            {step === 1 ? 'Create Widget' : 'Name Your Widget'}
                        </h2>
                        <button 
                            className="create-widget-modal__close-btn"
                            onClick={handleClose}
                        >
                            <i className='bx bx-x'></i>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="create-widget-modal__content">
                        {step === 1 ? (
                            <>
                                <p className="create-widget-modal__subtitle">
                                    Select the type of widget you want to create
                                </p>
                                <div className="create-widget-modal__types">
                                    {WIDGET_TYPES.map((widget) => (
                                        <motion.button
                                            key={widget.type}
                                            className="create-widget-modal__type-btn"
                                            onClick={() => handleTypeSelect(widget.type)}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <div className="create-widget-modal__type-icon">
                                                <i className={`bx ${widget.icon}`}></i>
                                            </div>
                                            <div className="create-widget-modal__type-info">
                                                <h3>{widget.title}</h3>
                                                <p>{widget.description}</p>
                                            </div>
                                            <i className='bx bx-chevron-right'></i>
                                        </motion.button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="create-widget-modal__subtitle">
                                    Give your widget a descriptive name
                                </p>
                                
                                <div className="create-widget-modal__preview">
                                    <div className="create-widget-modal__preview-icon">
                                        <i className={`bx ${WIDGET_TYPES.find(w => w.type === selectedType)?.icon}`}></i>
                                    </div>
                                    <span>{WIDGET_TYPES.find(w => w.type === selectedType)?.title}</span>
                                </div>

                                <div className="create-widget-modal__input-group">
                                    <label>Widget Name</label>
                                    <input
                                        type="text"
                                        value={widgetName}
                                        onChange={(e) => setWidgetName(e.target.value)}
                                        placeholder="e.g., Work Passwords, Travel Notes..."
                                        autoFocus
                                        onKeyDown={(e) => {
                                            e.stopPropagation();
                                            if (e.key === 'Enter') handleCreate();
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        onFocus={(e) => e.stopPropagation()}
                                    />
                                </div>

                                <motion.button
                                    className="create-widget-modal__create-btn"
                                    onClick={handleCreate}
                                    disabled={!widgetName.trim()}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <i className='bx bx-plus'></i>
                                    Create Widget
                                </motion.button>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CreateWidgetModal;

