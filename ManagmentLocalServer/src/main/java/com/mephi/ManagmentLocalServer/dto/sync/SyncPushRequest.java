package com.mephi.ManagmentLocalServer.dto.sync;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SyncPushRequest {
    
    private boolean forceSync = false; // Принудительная синхронизация всех данных
    private boolean syncNotes = true; // Синхронизировать заметки
    private boolean syncPasswords = true; // Синхронизировать пароли
    private ConflictResolutionStrategy conflictStrategy = ConflictResolutionStrategy.LATEST_TIMESTAMP; // Стратегия разрешения конфликтов
} 