import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  X,
  Save,
  RefreshCw,
  Tag,
  Type
} from 'lucide-react';

const NoteForm = ({ 
  initialData = null, 
  onSave, 
  onCancel, 
  isEditing = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'Personal'
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Загружаем данные для редактирования
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        content: initialData.content || '',
        type: initialData.type || 'Personal'
      });
    }
  }, [initialData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Убираем ошибку при изменении поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Save failed:', error);
      setErrors({ submit: error.message || 'Failed to save note' });
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = [
    'Personal', 'Work', 'Ideas', 'Shopping', 'Travel', 
    'Health', 'Finance', 'Education', 'Recipes', 'Other'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 'var(--spacing-md)'
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-2xl)',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          padding: 'var(--spacing-lg)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <FileText style={{ color: 'var(--color-warning)' }} />
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
              {isEditing ? 'Edit Note' : 'Add New Note'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 'var(--spacing-xs)',
              borderRadius: 'var(--border-radius-sm)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ 
          padding: 'var(--spacing-lg)', 
          overflow: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Title */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              <Type size={16} style={{ marginRight: 'var(--spacing-xs)' }} />
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Meeting notes, Shopping list"
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                fontSize: 'var(--font-size-md)',
                borderRadius: 'var(--border-radius-md)',
                border: `1px solid ${errors.title ? 'var(--color-danger)' : 'var(--border-color)'}`,
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            />
            {errors.title && (
              <p style={{ 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--color-danger)', 
                margin: 'var(--spacing-xs) 0 0 0' 
              }}>
                {errors.title}
              </p>
            )}
          </div>

          {/* Type */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              <Tag size={16} style={{ marginRight: 'var(--spacing-xs)' }} />
              Category
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                fontSize: 'var(--font-size-md)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            >
              {typeOptions.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div style={{ 
            marginBottom: 'var(--spacing-lg)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              Content *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="Write your note here..."
              style={{
                width: '100%',
                minHeight: '200px',
                flex: 1,
                padding: 'var(--spacing-md)',
                fontSize: 'var(--font-size-md)',
                borderRadius: 'var(--border-radius-md)',
                border: `1px solid ${errors.content ? 'var(--color-danger)' : 'var(--border-color)'}`,
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
            {errors.content && (
              <p style={{ 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--color-danger)', 
                margin: 'var(--spacing-xs) 0 0 0' 
              }}>
                {errors.content}
              </p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div style={{
              marginBottom: 'var(--spacing-md)',
              padding: 'var(--spacing-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--border-radius-md)',
              color: 'var(--color-danger)',
              fontSize: 'var(--font-size-sm)'
            }}>
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: 'var(--spacing-md)',
            justifyContent: 'flex-end',
            paddingTop: 'var(--spacing-md)',
            borderTop: '1px solid var(--border-color)'
          }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-lg)',
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-md)',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-lg)',
                background: loading ? 'var(--bg-tertiary)' : 'var(--color-success)',
                color: loading ? 'var(--text-secondary)' : 'white',
                border: 'none',
                borderRadius: 'var(--border-radius-md)',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)'
              }}
            >
              {loading ? (
                <RefreshCw size={16} style={{
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                <Save size={16} />
              )}
              {loading ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default NoteForm; 