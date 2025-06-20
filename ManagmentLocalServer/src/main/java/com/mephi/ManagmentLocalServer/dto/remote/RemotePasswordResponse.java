package com.mephi.ManagmentLocalServer.dto.remote;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RemotePasswordResponse {
    
    private String id;
    private String encryptedTitle;
    private String encryptedSite;
    private String encryptedLogin;
    private String encryptedPassword;
    private String encryptedType;
    private Instant createdAt;
    private Instant updatedAt;
} 