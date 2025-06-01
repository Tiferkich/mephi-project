package com.mephi.ManagmentLocalServer.dto.password;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResponse {
    
    private Long id;
    private String encryptedTitle;
    private String encryptedSite;
    private String encryptedLogin;
    private String encryptedPassword;
    private String encryptedType;
    private String remoteId;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant lastSyncAt;
} 
