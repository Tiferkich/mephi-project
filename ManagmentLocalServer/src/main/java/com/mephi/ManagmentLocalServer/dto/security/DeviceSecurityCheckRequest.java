package com.mephi.ManagmentLocalServer.dto.security;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DeviceSecurityCheckRequest {
    @NotNull(message = "snapshot is required")
    @Valid
    private ClientDeviceSnapshotDto snapshot;
}
