package com.mephi.ManagmentLocalServer.dto.password;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PasswordRequest {
    
    @NotBlank(message = "Encrypted title is required")
    private String encryptedTitle;
    
    @NotBlank(message = "Encrypted site is required")
    private String encryptedSite;
    
    @NotBlank(message = "Encrypted login is required")
    private String encryptedLogin;
    
    @NotBlank(message = "Encrypted password is required")
    private String encryptedPassword;
    
    @NotBlank(message = "Encrypted type is required")
    private String encryptedType;
} 
