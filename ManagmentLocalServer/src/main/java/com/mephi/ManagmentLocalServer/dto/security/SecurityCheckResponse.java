package com.mephi.ManagmentLocalServer.dto.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SecurityCheckResponse {
    private String checkId;
    private boolean allowed;
    private String denyReason;
    private Map<String, Object> policy;
}
