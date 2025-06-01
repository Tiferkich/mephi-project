package com.mephi.ManagmentLocalServer.dto.remote;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RemoteRegisterRequest {
    
    @NotBlank(message = "Username is required")
    private String username;
    
    @NotBlank(message = "Salt is required")
    private String salt;
    
    @NotBlank(message = "Password hash is required")
    private String passwordHash;
} 