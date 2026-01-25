/**
 * File Service - Управление зашифрованными файлами
 * ============================================================================
 * 
 * Сервис для загрузки, скачивания и управления файлами.
 * Все файлы шифруются на клиенте с использованием ГОСТ 34.12-2018 "Кузнечик"
 * перед отправкой на сервер.
 */

import axios from 'axios';
import { encryptFile, decryptFile, encryptString, decryptString } from './gostCrypto';

const LOCAL_API = 'http://localhost:3001';

// Создаем axios instance с токеном для локального сервера
const createLocalApi = (baseURL) => {
    const api = axios.create({ baseURL });
    
    api.interceptors.request.use((config) => {
        // authToken - токен для локального сервера
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Remote token хранится на local server в БД пользователя
        // и используется автоматически при проксировании на remote server
        return config;
    });
    
    return api;
};

const localApi = createLocalApi(LOCAL_API);

/**
 * Загрузка файла на локальный сервер
 * @param {File} file - Файл для загрузки
 * @param {string} password - Мастер-пароль для шифрования
 * @param {Function} onProgress - Callback для прогресса загрузки
 * @param {string} widgetId - ID виджета к которому привязан файл
 * @returns {Promise<object>} - Информация о загруженном файле
 */
export async function uploadFile(file, password, onProgress = null, widgetId = null) {
    try {
        // Шифруем файл на клиенте с использованием ГОСТ
        const { encryptedData, metadata } = await encryptFile(file, password);
        
        // Создаем FormData
        const formData = new FormData();
        const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });
        formData.append('file', encryptedBlob, 'encrypted_file');
        formData.append('encryptedName', metadata.encryptedName);
        formData.append('encryptedMimeType', metadata.encryptedMimeType);
        formData.append('checksum', metadata.checksum);
        formData.append('originalSize', metadata.originalSize.toString());
        // IV и Salt для дешифровки данных файла
        formData.append('dataIv', metadata.iv);
        formData.append('dataSalt', metadata.salt);
        // Widget ID для привязки к виджету
        console.log('[FileService] Uploading file with widgetId:', widgetId);
        if (widgetId) {
            formData.append('widgetId', widgetId);
        }
        
        // Отправляем на сервер
        const response = await localApi.post('/files/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percent);
                }
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw new Error(error.response?.data?.message || 'Failed to upload file');
    }
}

/**
 * Проверка, истёк ли JWT токен
 * @param {string} token - JWT токен
 * @returns {boolean} - true если токен истёк
 */
function isTokenExpired(token) {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // JWT exp в секундах, конвертируем в мс
        return Date.now() >= exp;
    } catch (e) {
        console.error('[FileService] Failed to parse token:', e);
        return true;
    }
}

/**
 * Загрузка файла на удаленный сервер (online режим, с проверкой на вирусы)
 * Запрос идёт через Local Server который проксирует на Remote Server
 * Remote token берётся из БД пользователя на Local Server
 * @param {File} file - Файл для загрузки
 * @param {string} password - Мастер-пароль для шифрования
 * @param {Function} onProgress - Callback для прогресса загрузки
 * @returns {Promise<object>} - Информация о загруженном файле с результатом сканирования
 */
export async function uploadFileRemote(file, password, onProgress = null, widgetId = null) {
    try {
        console.log('[FileService] Encrypting file for cloud upload...');
        const { encryptedData, metadata } = await encryptFile(file, password);
        
        const formData = new FormData();
        const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });
        formData.append('file', encryptedBlob, 'encrypted_file');
        formData.append('encryptedName', metadata.encryptedName);
        formData.append('encryptedMimeType', metadata.encryptedMimeType);
        formData.append('checksum', metadata.checksum);
        formData.append('originalSize', metadata.originalSize.toString());
        if (widgetId) {
            formData.append('widgetId', widgetId);
        }
        
        console.log('[FileService] Uploading to cloud via local server proxy...');
        
        // Отправляем через Local Server с проксированием на Remote Server
        // Remote token берётся из БД пользователя на сервере
        const response = await localApi.post('/remote-proxy/files/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percent);
                }
            }
        });
        
        console.log('[FileService] Cloud upload successful!');
        return response.data;
    } catch (error) {
        console.error('Error uploading file to remote:', error);
        
        // Обработка ошибок
        if (error.response?.status === 403) {
            throw new Error('Облачная синхронизация не настроена. Настройте синхронизацию в Cloud Sync Manager.');
        }
        if (error.response?.status === 401) {
            throw new Error('Необходима авторизация. Пожалуйста, войдите в систему.');
        }
        
        const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
        throw new Error(errorMsg || 'Ошибка загрузки файла в облако');
    }
}

/**
 * Получение списка файлов
 * @returns {Promise<Array>} - Список файлов
 */
/**
 * Получение списка файлов
 * @param {string} widgetId - Опциональный ID виджета для фильтрации
 * @returns {Promise<array>} - Список файлов
 */
export async function getFiles(widgetId = null) {
    try {
        console.log('[FileService] Getting files with widgetId:', widgetId);
        const params = widgetId ? { widgetId } : {};
        const response = await localApi.get('/files', { params });
        console.log('[FileService] Received', response.data.length, 'files');
        return response.data;
    } catch (error) {
        console.error('Error fetching files:', error);
        throw new Error('Failed to fetch files');
    }
}

/**
 * Получение информации о файле
 * @param {number} fileId - ID файла
 * @returns {Promise<object>} - Информация о файле
 */
export async function getFileInfo(fileId) {
    try {
        const response = await localApi.get(`/files/${fileId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching file info:', error);
        throw new Error('Failed to fetch file info');
    }
}

/**
 * Скачивание и дешифрование файла
 * @param {number} fileId - ID файла
 * @param {string} password - Мастер-пароль для дешифрования
 * @returns {Promise<{blob: Blob, name: string, mimeType: string}>}
 */
export async function downloadFile(fileId, password) {
    try {
        const response = await localApi.get(`/files/${fileId}/download`, {
            responseType: 'arraybuffer'
        });
        
        // Получаем метаданные из заголовков (axios возвращает их в нижнем регистре)
        const headers = response.headers;
        console.log('Download response headers:', Object.keys(headers));
        
        const encryptedName = headers['x-encrypted-name'];
        const encryptedMimeType = headers['x-encrypted-mimetype'];
        const checksum = headers['x-checksum'];
        const dataIv = headers['x-data-iv'];
        const dataSalt = headers['x-data-salt'];
        
        console.log('Headers:', { encryptedName: !!encryptedName, dataIv: !!dataIv, dataSalt: !!dataSalt });
        
        if (!encryptedName) {
            throw new Error('Missing x-encrypted-name header');
        }
        
        if (!dataIv || !dataSalt) {
            throw new Error('Missing x-data-iv or x-data-salt headers');
        }
        
        // Дешифруем файл
        const encryptedData = new Uint8Array(response.data);
        const metadata = {
            encryptedName,
            encryptedMimeType,
            iv: dataIv,     // IV для данных файла
            salt: dataSalt  // Salt для данных файла
        };
        
        console.log('Decryption metadata:', { iv: dataIv, salt: dataSalt });
        
        const { data, name, mimeType } = await decryptFile(encryptedData, metadata, password);
        
        // Создаем Blob для скачивания
        const blob = new Blob([data], { type: mimeType });
        
        return { blob, name, mimeType };
    } catch (error) {
        console.error('Error downloading file:', error);
        throw new Error(`Failed to download file: ${error.message}`);
    }
}

/**
 * Удаление файла
 * @param {number} fileId - ID файла
 */
export async function deleteFile(fileId) {
    try {
        await localApi.delete(`/files/${fileId}`);
    } catch (error) {
        console.error('Error deleting file:', error);
        throw new Error('Failed to delete file');
    }
}

/**
 * Запрос на сканирование файла на вирусы (только online режим)
 * @param {number} fileId - ID файла
 * @returns {Promise<object>} - Результат сканирования
 */
export async function scanFile(fileId) {
    try {
        const response = await localApi.post(`/files/${fileId}/scan`);
        return response.data;
    } catch (error) {
        if (error.response?.status === 503) {
            // Offline режим
            return {
                success: false,
                status: 'NOT_SCANNED',
                message: 'Проверка на вирусы доступна только в online режиме'
            };
        }
        console.error('Error scanning file:', error);
        throw new Error('Failed to scan file');
    }
}

/**
 * Получение статуса сканирования (для remote файлов)
 * @param {number} fileId - ID файла на remote сервере
 * @returns {Promise<object>} - Статус сканирования
 */
export async function getScanStatus(fileId) {
    try {
        const remoteToken = localStorage.getItem('remoteToken');
        const response = await remoteApi.get(`/api/files/${fileId}/scan-status`, {
            headers: {
                ...(remoteToken && { Authorization: `Bearer ${remoteToken}` })
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error getting scan status:', error);
        throw new Error('Failed to get scan status');
    }
}

/**
 * Получение статистики файлов
 * @returns {Promise<object>} - Статистика
 */
export async function getFileStats() {
    try {
        const response = await localApi.get('/files/stats');
        return response.data;
    } catch (error) {
        console.error('Error fetching file stats:', error);
        return { fileCount: 0, totalSize: 0, totalSizeFormatted: '0 B' };
    }
}

/**
 * Инициирует скачивание файла в браузере
 * @param {Blob} blob - Данные файла
 * @param {string} filename - Имя файла
 */
export function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Форматирование размера файла
 * @param {number} bytes - Размер в байтах
 * @returns {string} - Форматированный размер
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Получение иконки для типа файла
 * @param {string} mimeType - MIME тип файла
 * @returns {string} - Название иконки
 */
export function getFileIcon(mimeType) {
    if (!mimeType) return 'File';
    
    if (mimeType.startsWith('image/')) return 'Image';
    if (mimeType.startsWith('video/')) return 'Video';
    if (mimeType.startsWith('audio/')) return 'Music';
    if (mimeType.includes('pdf')) return 'FileText';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'FileText';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Table';
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return 'Archive';
    if (mimeType.includes('text/')) return 'FileText';
    
    return 'File';
}

/**
 * Получение цвета статуса сканирования
 * @param {string} status - Статус сканирования
 * @returns {string} - CSS цвет
 */
export function getScanStatusColor(status) {
    switch (status) {
        case 'CLEAN': return '#22c55e';      // green
        case 'INFECTED': return '#ef4444';   // red
        case 'PENDING': return '#f59e0b';    // amber
        case 'ERROR': return '#ef4444';      // red
        case 'NOT_SCANNED': return '#6b7280'; // gray
        default: return '#6b7280';
    }
}

/**
 * Получение текста статуса сканирования
 * @param {string} status - Статус сканирования
 * @param {number} threatsFound - Количество угроз
 * @returns {string} - Текст статуса
 */
export function getScanStatusText(status, threatsFound = 0) {
    switch (status) {
        case 'CLEAN': return '✓ Безопасен';
        case 'INFECTED': return `⚠ Угрозы: ${threatsFound}`;
        case 'PENDING': return '⏳ Проверка...';
        case 'ERROR': return '✗ Ошибка проверки';
        case 'NOT_SCANNED': return '○ Не проверен';
        default: return '○ Неизвестно';
    }
}

export default {
    uploadFile,
    uploadFileRemote,
    getFiles,
    getFileInfo,
    downloadFile,
    deleteFile,
    scanFile,
    getScanStatus,
    getFileStats,
    triggerDownload,
    formatFileSize,
    getFileIcon,
    getScanStatusColor,
    getScanStatusText
};

