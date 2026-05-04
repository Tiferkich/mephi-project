package com.mephi.ManagmentLocalServer.dto.security;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AntivirusProductDto {
    private String name;
    private Boolean enabled;
    private Boolean realtimeProtection;
    private Boolean definitionsUpToDate;
    private Map<String, Object> raw;
}
