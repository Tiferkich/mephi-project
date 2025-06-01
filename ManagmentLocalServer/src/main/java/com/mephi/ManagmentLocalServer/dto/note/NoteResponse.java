package com.mephi.ManagmentLocalServer.dto.note;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NoteResponse {
    
    private Long id;
    private String encryptedTitle;
    private String encryptedType;
    private String encryptedData;
    private String remoteId;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant lastSyncAt;
} 

