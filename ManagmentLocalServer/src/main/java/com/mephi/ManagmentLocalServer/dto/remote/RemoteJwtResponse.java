package com.mephi.ManagmentLocalServer.dto.remote;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RemoteJwtResponse {
    
    private String token;
    private String type = "Bearer";
    private String userId;
    private String username;
} 