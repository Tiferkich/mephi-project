package com.mephi.ManagmentLocalServer.dto.remote;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RemoteNoteResponse {
    
    private String id;
    private String encryptedTitle;
    private String encryptedType;
    private String encryptedData;
    private Instant createdAt;
    private Instant updatedAt;
} 