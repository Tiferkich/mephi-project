package com.mephi.ManagmentLocalServer.dto.sync;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SyncResponse {
    
    private boolean success;
    private String message;
    private Instant syncTime;
    
    // Статистика синхронизации
    private int notesPushed = 0;
    private int notesPulled = 0;
    private int passwordsPushed = 0;
    private int passwordsPulled = 0;
    private int conflicts = 0;
    
    public static SyncResponse success(String message) {
        SyncResponse response = new SyncResponse();
        response.setSuccess(true);
        response.setMessage(message);
        response.setSyncTime(Instant.now());
        return response;
    }
    
    public static SyncResponse error(String message) {
        SyncResponse response = new SyncResponse();
        response.setSuccess(false);
        response.setMessage(message);
        response.setSyncTime(Instant.now());
        return response;
    }
} 