package com.mephi.ManagmentLocalServer.dto.security;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ClientDeviceSnapshotDto {
    private String platform;
    private String hostname;
    private String providerVersion;
    /** ISO-8601 from client */
    private String collectedAt;
    private List<AntivirusProductDto> antivirusProducts;
    private Boolean overallEnabled;
    private Boolean overallDefinitionsUpToDate;
    private String error;
}
