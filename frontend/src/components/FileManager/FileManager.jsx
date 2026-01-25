/**
 * FileManager Component
 * =====================
 * Компонент для управления зашифрованными файлами.
 * Поддерживает загрузку, скачивание, удаление и сканирование файлов.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Upload, Download, Trash2, Shield, ShieldCheck, ShieldAlert, 
    RefreshCw, File, Image, FileText, Music, Video, Archive, 
    Table, AlertCircle, CheckCircle, Clock, X, FolderOpen,
    Cloud, HardDrive, ChevronDown, ChevronUp
} from 'lucide-react';
import fileService from '../../services/fileService';
import { decryptString } from '../../services/gostCrypto';
import './FileManager.css';

const FileManager = ({ widgetId, isUnlocked, masterPassword, isOnline = false, compact = false }) => {
    console.log('[FileManager] Rendering with widgetId:', widgetId);
    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const [stats, setStats] = useState({ fileCount: 0, totalSize: 0, totalSizeFormatted: '0 B' });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [dropzoneCollapsed, setDropzoneCollapsed] = useState(false);
    const [decryptedNames, setDecryptedNames] = useState({});

    // Расшифровка имени файла
    const decryptFileName = useCallback(async (encryptedName, fileId) => {
        if (!masterPassword || !encryptedName) return null;
        try {
            // Проверяем, является ли это зашифрованным JSON
            if (encryptedName.startsWith('{')) {
                const name = await decryptString(encryptedName, masterPassword);
                setDecryptedNames(prev => ({ ...prev, [fileId]: name }));
                return name;
            }
            return encryptedName;
        } catch (err) {
            console.error('Failed to decrypt file name:', err);
            return null;
        }
    }, [masterPassword]);

    // Загрузка списка файлов
    const loadFiles = useCallback(async () => {
        if (!isUnlocked) return;
        
        setIsLoading(true);
        try {
            const fileList = await fileService.getFiles(widgetId);
            setFiles(fileList);
            
            // Расшифровываем имена файлов
            if (masterPassword) {
                for (const file of fileList) {
                    decryptFileName(file.encryptedName, file.id);
                }
            }
            
            const fileStats = await fileService.getFileStats();
            setStats(fileStats);
        } catch (err) {
            setError('Не удалось загрузить файлы');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [isUnlocked, widgetId, masterPassword, decryptFileName]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    // Загрузка файла
    const handleUpload = async (fileList) => {
        if (!masterPassword) {
            setError('Хранилище заблокировано');
            return;
        }

        setError(null);
        setSuccess(null);
        
        for (const file of fileList) {
            try {
                setUploadProgress({ name: file.name, percent: 0 });
                
                await fileService.uploadFile(file, masterPassword, (percent) => {
                    setUploadProgress({ name: file.name, percent });
                }, widgetId);
                
                setSuccess(`Файл "${file.name}" загружен`);
            } catch (err) {
                setError(`Ошибка загрузки "${file.name}": ${err.message}`);
            }
        }
        
        setUploadProgress(null);
        loadFiles();
    };

    // Загрузка файла в облако (с проверкой на вирусы)
    const handleUploadToCloud = async (fileList) => {
        if (!masterPassword) {
            setError('Хранилище заблокировано');
            return;
        }

        if (!isOnline) {
            setError('Облачная загрузка доступна только в online режиме');
            return;
        }

        setError(null);
        setSuccess(null);
        
        for (const file of fileList) {
            try {
                setUploadProgress({ name: file.name, percent: 0, cloud: true });
                
                const result = await fileService.uploadFileRemote(file, masterPassword, (percent) => {
                    setUploadProgress({ name: file.name, percent, cloud: true });
                }, widgetId);
                
                if (result.scanStatus === 'INFECTED') {
                    setError(`⚠️ Файл "${file.name}" содержит угрозы!`);
                } else {
                    setSuccess(`Файл "${file.name}" загружен в облако и проверен`);
                }
            } catch (err) {
                setError(`Ошибка загрузки "${file.name}": ${err.message}`);
            }
        }
        
        setUploadProgress(null);
        loadFiles();
    };

    // Скачивание файла
    const handleDownload = async (fileId) => {
        if (!masterPassword) {
            setError('Хранилище заблокировано');
            return;
        }

        try {
            const { blob, name } = await fileService.downloadFile(fileId, masterPassword);
            fileService.triggerDownload(blob, name);
            setSuccess(`Файл "${name}" скачан`);
        } catch (err) {
            setError('Ошибка скачивания файла');
            console.error(err);
        }
    };

    // Удаление файла
    const handleDelete = async (fileId) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот файл?')) return;

        try {
            await fileService.deleteFile(fileId);
            setSuccess('Файл удален');
            loadFiles();
        } catch (err) {
            setError('Ошибка удаления файла');
            console.error(err);
        }
    };

    // Сканирование на вирусы
    const handleScan = async (fileId) => {
        try {
            const result = await fileService.scanFile(fileId);
            
            if (!result.success) {
                setError(result.message);
            } else if (result.status === 'INFECTED') {
                setError(`⚠️ Обнаружены угрозы: ${result.threatsFound}`);
            } else if (result.status === 'CLEAN') {
                setSuccess('Файл безопасен');
            } else {
                setSuccess('Проверка запущена');
            }
            
            loadFiles();
        } catch (err) {
            setError('Ошибка сканирования');
            console.error(err);
        }
    };

    // Drag & Drop
    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        
        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) {
            handleUpload(droppedFiles);
        }
    };

    // Выбор файлов через input
    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 0) {
            handleUpload(selectedFiles);
        }
        e.target.value = ''; // Сброс для повторного выбора того же файла
    };

    // Иконка для типа файла
    const FileIcon = ({ mimeType }) => {
        const iconName = fileService.getFileIcon(mimeType);
        const iconMap = {
            'Image': Image,
            'Video': Video,
            'Music': Music,
            'FileText': FileText,
            'Table': Table,
            'Archive': Archive,
            'File': File
        };
        const Icon = iconMap[iconName] || File;
        return <Icon className="file-icon" />;
    };

    // Иконка статуса сканирования
    const ScanStatusIcon = ({ status, threatsFound }) => {
        switch (status) {
            case 'CLEAN':
                return <ShieldCheck className="scan-icon clean" title="Безопасен" />;
            case 'INFECTED':
                return <ShieldAlert className="scan-icon infected" title={`Угрозы: ${threatsFound}`} />;
            case 'PENDING':
                return <RefreshCw className="scan-icon pending spinning" title="Проверка..." />;
            case 'ERROR':
                return <AlertCircle className="scan-icon error" title="Ошибка" />;
            default:
                return <Shield className="scan-icon not-scanned" title="Не проверен" />;
        }
    };

    if (!isUnlocked) {
        return (
            <div className="file-manager locked">
                <FolderOpen className="locked-icon" />
                <p>Разблокируйте хранилище для доступа к файлам</p>
            </div>
        );
    }

    // Если хранилище разблокировано, но masterPassword не передан (например после перезагрузки страницы)
    if (!masterPassword) {
        return (
            <div className="file-manager locked">
                <FolderOpen className="locked-icon" />
                <p>Пожалуйста, заблокируйте и снова разблокируйте хранилище для работы с файлами</p>
                <small style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                    Это необходимо для шифрования файлов
                </small>
            </div>
        );
    }

    return (
        <div className="file-manager">
            {/* Header */}
            <div className="fm-header">
                <h2>
                    <FolderOpen /> Файловый менеджер
                </h2>
                <div className="fm-stats">
                    <span>{stats.fileCount} файлов</span>
                    <span>•</span>
                    <span>{stats.totalSizeFormatted}</span>
                </div>
            </div>

            {/* Notifications */}
            {error && (
                <div className="fm-notification error">
                    <AlertCircle />
                    <span>{error}</span>
                    <button onClick={() => setError(null)}><X /></button>
                </div>
            )}
            {success && (
                <div className="fm-notification success">
                    <CheckCircle />
                    <span>{success}</span>
                    <button onClick={() => setSuccess(null)}><X /></button>
                </div>
            )}

            {/* Upload Progress */}
            {uploadProgress && (
                <div className="fm-upload-progress">
                    <div className="upload-info">
                        {uploadProgress.cloud ? <Cloud /> : <HardDrive />}
                        <span>{uploadProgress.name}</span>
                        <span>{uploadProgress.percent}%</span>
                    </div>
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ width: `${uploadProgress.percent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Drop Zone */}
            <div className="fm-dropzone-container">
                <button 
                    className="fm-dropzone-toggle"
                    onClick={() => setDropzoneCollapsed(!dropzoneCollapsed)}
                >
                    <Upload size={16} />
                    <span>Загрузить файлы</span>
                    {dropzoneCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
                
                {!dropzoneCollapsed && (
            <div 
                className={`fm-dropzone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <Upload className="dropzone-icon" />
                <p>Перетащите файлы сюда или нажмите для выбора</p>
                <div className="dropzone-buttons">
                    <label className="btn btn-primary">
                        <HardDrive /> Локально
                        <input 
                            type="file" 
                            multiple 
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                    </label>
                    {isOnline && (
                        <label className="btn btn-secondary">
                            <Cloud /> В облако
                            <input 
                                type="file" 
                                multiple 
                                onChange={(e) => {
                                    const files = Array.from(e.target.files);
                                    if (files.length > 0) handleUploadToCloud(files);
                                    e.target.value = '';
                                }}
                                style={{ display: 'none' }}
                            />
                        </label>
                    )}
                </div>
                <p className="dropzone-hint">
                    {isOnline 
                        ? 'Облачная загрузка включает проверку на вирусы'
                        : 'Offline режим: проверка на вирусы недоступна'}
                </p>
                    </div>
                )}
            </div>

            {/* File List */}
            <div className="fm-file-list">
                {isLoading ? (
                    <div className="fm-loading">
                        <RefreshCw className="spinning" />
                        <span>Загрузка файлов...</span>
                    </div>
                ) : files.length === 0 ? (
                    <div className="fm-empty">
                        <File className="empty-icon" />
                        <p>Нет файлов</p>
                        <p className="hint">Загрузите первый файл, чтобы начать</p>
                    </div>
                ) : (
                    <table className="fm-table">
                        <thead>
                            <tr>
                                <th>Файл</th>
                                <th>Размер</th>
                                <th>Статус</th>
                                <th>Дата</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map((file) => (
                                <tr key={file.id} className={file.scanStatus === 'INFECTED' ? 'infected' : ''}>
                                    <td className="file-name-cell">
                                        <FileIcon mimeType={file.encryptedMimeType} />
                                        <span className="file-name" title={decryptedNames[file.id] || file.encryptedName}>
                                            {(() => {
                                                const displayName = decryptedNames[file.id] || file.encryptedName;
                                                return displayName.length > 30 
                                                    ? displayName.substring(0, 30) + '...' 
                                                    : displayName;
                                            })()}
                                        </span>
                                        {file.remoteId && <Cloud className="synced-icon" title="В облаке" />}
                                    </td>
                                    <td>{fileService.formatFileSize(file.originalSize)}</td>
                                    <td className="scan-status-cell">
                                        <ScanStatusIcon status={file.scanStatus} threatsFound={file.threatsFound} />
                                        <span className={`scan-text ${file.scanStatus.toLowerCase()}`}>
                                            {fileService.getScanStatusText(file.scanStatus, file.threatsFound)}
                                        </span>
                                    </td>
                                    <td>{new Date(file.createdAt).toLocaleDateString()}</td>
                                    <td className="actions-cell">
                                        <button 
                                            className="action-btn download"
                                            onClick={() => handleDownload(file.id)}
                                            title="Скачать"
                                        >
                                            <Download />
                                        </button>
                                        {isOnline && file.scanStatus !== 'PENDING' && (
                                            <button 
                                                className="action-btn scan"
                                                onClick={() => handleScan(file.id)}
                                                title="Проверить на вирусы"
                                            >
                                                <Shield />
                                            </button>
                                        )}
                                        <button 
                                            className="action-btn delete"
                                            onClick={() => handleDelete(file.id)}
                                            title="Удалить"
                                        >
                                            <Trash2 />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Refresh Button */}
            <div className="fm-footer">
                <button className="btn btn-outline" onClick={loadFiles} disabled={isLoading}>
                    <RefreshCw className={isLoading ? 'spinning' : ''} />
                    Обновить
                </button>
            </div>
        </div>
    );
};

export default FileManager;

