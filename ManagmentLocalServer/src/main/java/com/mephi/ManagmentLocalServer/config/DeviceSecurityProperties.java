package com.mephi.ManagmentLocalServer.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "security.device")
public class DeviceSecurityProperties {

    /**
     * If false, all checks are allowed and login is not blocked.
     */
    private boolean enforce = true;

    private boolean requireRealtime = true;

    private boolean requireUpToDate = false;

    private int maxSnapshotAgeSeconds = 60;

    /**
     * If true, non-Windows (stub) snapshots are not blocked.
     */
    private boolean allowStubProviders = true;
}
