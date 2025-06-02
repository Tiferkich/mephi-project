import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Key, 
  Globe, 
  User, 
  Eye, 
  EyeOff, 
  Copy, 
  Edit, 
  Trash2, 
  Check,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';

const PasswordList = ({ 
  passwords = [], 
  onEdit, 
  onDelete, 
  loading = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [showPasswords, setShowPasswords] = useState({});
  const [copySuccess, setCopySuccess] = useState({});
  const [selectedPassword, setSelectedPassword] = useState(null);

  const handleCopy = async (text, field, passwordId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess({ [`${passwordId}-${field}`]: true });
      setTimeout(() => {
        setCopySuccess(prev => ({ ...prev, [`${passwordId}-${field}`]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const togglePasswordVisibility = (passwordId) => {
    setShowPasswords(prev => ({
      ...prev,
      [passwordId]: !prev[passwordId]
    }));
  };

  const getTypeOptions = () => {
    const types = [...new Set(passwords.map(p => p.type))];
    return ['All', ...types.sort()];
  };

  const filteredPasswords = passwords.filter(password => {
    const matchesSearch = password.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         password.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         password.login.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'All' || password.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
        Loading passwords...
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
            <Key style={{ color: 'var(--color-info)' }} />
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
              Passwords ({filteredPasswords.length})
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
              placeholder="Search passwords..."
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

      {/* Password List */}
      <div style={{ maxHeight: '400px', overflow: 'auto' }}>
        {filteredPasswords.length === 0 ? (
          <div style={{
            padding: 'var(--spacing-2xl)',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            {searchTerm || filterType !== 'All' ? 
              'No passwords match your search criteria' : 
              'No passwords saved yet'
            }
          </div>
        ) : (
          filteredPasswords.map((password, index) => (
            <motion.div
              key={password.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              style={{
                padding: 'var(--spacing-lg)',
                borderBottom: index < filteredPasswords.length - 1 ? '1px solid var(--border-color)' : 'none',
                background: selectedPassword === password.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 'var(--spacing-md)'
              }}>
                <div>
                  <h4 style={{
                    margin: '0 0 var(--spacing-xs) 0',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--font-size-md)',
                    fontWeight: 'var(--font-weight-medium)'
                  }}>
                    {password.title}
                  </h4>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)'
                  }}>
                    <span style={{
                      background: 'var(--color-info)',
                      color: 'white',
                      padding: '2px var(--spacing-xs)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: 'var(--font-size-xs)'
                    }}>
                      {password.type}
                    </span>
                    <span>•</span>
                    <span>Updated {formatDate(password.updatedAt)}</span>
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setSelectedPassword(selectedPassword === password.id ? null : password.id)}
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

                  {selectedPassword === password.id && (
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
                    >
                      <button
                        onClick={() => {
                          onEdit(password);
                          setSelectedPassword(null);
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
                        onClick={() => {
                          onDelete(password.id);
                          setSelectedPassword(null);
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

              {/* Password Details */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--spacing-md)'
              }}>
                {/* Site */}
                {password.site && (
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)',
                      marginBottom: 'var(--spacing-xs)',
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--text-secondary)'
                    }}>
                      <Globe size={12} />
                      Website
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-sm)'
                    }}>
                      <span style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--text-primary)',
                        wordBreak: 'break-all'
                      }}>
                        {password.site}
                      </span>
                      <button
                        onClick={() => handleCopy(password.site, 'site', password.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copySuccess[`${password.id}-site`] ? 'var(--color-success)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: 'var(--spacing-xs)'
                        }}
                      >
                        {copySuccess[`${password.id}-site`] ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Login */}
                {password.login && (
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)',
                      marginBottom: 'var(--spacing-xs)',
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--text-secondary)'
                    }}>
                      <User size={12} />
                      Login
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-sm)'
                    }}>
                      <span style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--text-primary)',
                        wordBreak: 'break-all'
                      }}>
                        {password.login}
                      </span>
                      <button
                        onClick={() => handleCopy(password.login, 'login', password.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copySuccess[`${password.id}-login`] ? 'var(--color-success)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: 'var(--spacing-xs)'
                        }}
                      >
                        {copySuccess[`${password.id}-login`] ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Password */}
              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  marginBottom: 'var(--spacing-xs)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-secondary)'
                }}>
                  <Key size={12} />
                  Password
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)'
                }}>
                  <span style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}>
                    {showPasswords[password.id] ? password.password : '••••••••••••'}
                  </span>
                  <button
                    onClick={() => togglePasswordVisibility(password.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: 'var(--spacing-xs)'
                    }}
                  >
                    {showPasswords[password.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={() => handleCopy(password.password, 'password', password.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copySuccess[`${password.id}-password`] ? 'var(--color-success)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: 'var(--spacing-xs)'
                    }}
                  >
                    {copySuccess[`${password.id}-password`] ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default PasswordList; 