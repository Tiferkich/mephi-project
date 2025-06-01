package com.mephi.ManagmentLocalServer.dto.remote;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RemoteAuthRequest {
    
    @NotBlank(message = "Master password hash is required")
    private String masterPasswordHash; // SHA-256 хеш мастер-пароля
} 

