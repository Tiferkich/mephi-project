package com.mephi.ManagmentLocalServer.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {
    
    @NotBlank(message = "Password hash is required")
    private String passwordHash;

    /** UUID проверки из POST /security/check (при security.device.enforce=true) */
    private String securityCheckId;
} 

