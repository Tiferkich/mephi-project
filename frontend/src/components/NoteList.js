import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  MoreVertical,
  Tag
} from 'lucide-react';

const NoteList = ({ 
  notes = [], 
  onEdit, 
  onDelete, 
  loading = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [selectedNote, setSelectedNote] = useState(null);
  const [expandedNote, setExpandedNote] = useState(null);

  const getTypeOptions = () => {
    const types = [...new Set(notes.map(n => n.type))];
    return ['All', ...types.sort()];
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'All' || note.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateContent = (content, maxLength = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const getTypeColor = (type) => {
    const colors = {
      'Personal': 'var(--color-info)',
      'Work': 'var(--color-warning)',
      'Ideas': 'var(--color-success)',
      'Shopping': 'var(--color-info)',
      'Travel': 'var(--color-success)',
      'Health': 'var(--color-danger)',
      'Finance': 'var(--color-warning)',
      'Education': 'var(--color-info)',
      'Recipes': 'var(--color-success)',
      'Other': 'var(--text-secondary)'
    };
    return colors[type] || 'var(--text-secondary)';
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'var(--spacing-2xl)',
        color: 'var(--text-secondary)'
      }}>
        Loading notes...
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--border-radius-lg)',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-md)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--spacing-lg)',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-primary)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--spacing-md)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)'
          }}>
            <FileText style={{ color: 'var(--color-warning)' }} />
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
              Notes ({filteredNotes.length})
            </h3>
          </div>
        </div>

        {/* Search and Filter */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 'var(--spacing-md)'
        }}>
          <div style={{ position: 'relative' }}>
            <Search 
              size={16} 
              style={{
                position: 'absolute',
                left: 'var(--spacing-md)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)'
              }}
            />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--spacing-sm) var(--spacing-md) var(--spacing-sm) 40px',
                fontSize: 'var(--font-size-sm)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Filter 
              size={16} 
              style={{
                position: 'absolute',
                left: 'var(--spacing-md)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)'
              }}
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md) var(--spacing-sm) 40px',
                fontSize: 'var(--font-size-sm)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                minWidth: '120px'
              }}
            >
              {getTypeOptions().map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div style={{ maxHeight: '500px', overflow: 'auto' }}>
        {filteredNotes.length === 0 ? (
          <div style={{
            padding: 'var(--spacing-2xl)',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            {searchTerm || filterType !== 'All' ? 
              'No notes match your search criteria' : 
              'No notes saved yet'
            }
          </div>
        ) : (
          filteredNotes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              style={{
                padding: 'var(--spacing-lg)',
                borderBottom: index < filteredNotes.length - 1 ? '1px solid var(--border-color)' : 'none',
                background: selectedNote === note.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                cursor: 'pointer'
              }}
              onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 'var(--spacing-sm)'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    <h4 style={{
                      margin: 0,
                      color: 'var(--text-primary)',
                      fontSize: 'var(--font-size-md)',
                      fontWeight: 'var(--font-weight-medium)'
                    }}>
                      {note.title}
                    </h4>
                    <span style={{
                      background: getTypeColor(note.type),
                      color: 'white',
                      padding: '2px var(--spacing-xs)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: 'var(--font-size-xs)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)'
                    }}>
                      <Tag size={10} />
                      {note.type}
                    </span>
                  </div>
                  
                  <div style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--spacing-sm)'
                  }}>
                    Updated {formatDate(note.updatedAt)}
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNote(selectedNote === note.id ? null : note.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: 'var(--spacing-xs)',
                      borderRadius: 'var(--border-radius-sm)'
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>

                  {selectedNote === note.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 10,
                        minWidth: '120px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(note);
                          setSelectedNote(null);
                        }}
                        style={{
                          width: '100%',
                          padding: 'var(--spacing-sm) var(--spacing-md)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--spacing-sm)',
                          borderBottom: '1px solid var(--border-color)'
                        }}
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(note.id);
                          setSelectedNote(null);
                        }}
                        style={{
                          width: '100%',
                          padding: 'var(--spacing-sm) var(--spacing-md)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-danger)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--spacing-sm)'
                        }}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Note Content */}
              <div style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-primary)',
                lineHeight: 1.5
              }}>
                {expandedNote === note.id ? (
                  <div style={{
                    whiteSpace: 'pre-wrap',
                    marginTop: 'var(--spacing-sm)',
                    padding: 'var(--spacing-md)',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--border-color)'
                  }}>
                    {note.content}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {truncateContent(note.content)}
                    {note.content.length > 150 && (
                      <span style={{
                        color: 'var(--color-info)',
                        fontWeight: 'var(--font-weight-medium)',
                        marginLeft: 'var(--spacing-xs)'
                      }}>
                        Click to read more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default NoteList; 