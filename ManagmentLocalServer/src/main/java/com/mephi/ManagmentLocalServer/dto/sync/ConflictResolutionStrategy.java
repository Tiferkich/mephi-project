package com.mephi.ManagmentLocalServer.dto.sync;

/**
 * Стратегии разрешения конфликтов при синхронизации
 */
public enum ConflictResolutionStrategy {
    
    /**
     * Локальная версия имеет приоритет (по умолчанию)
     */
    LOCAL_WINS,
    
    /**
     * Удаленная версия имеет приоритет
     */
    REMOTE_WINS,
    
    /**
     * Выбрать версию с более новой датой обновления
     */
    LATEST_TIMESTAMP,
    
    /**
     * Создать дубликат записи при конфликте
     */
    CREATE_DUPLICATE,
    
    /**
     * Пропустить конфликтные записи
     */
    SKIP_CONFLICTS
} 

