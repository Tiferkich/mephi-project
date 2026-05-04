package com.mephi.ManagmentLocalServer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "device_security_snapshots", indexes = {
        @Index(name = "idx_dss_check_id", columnList = "checkId")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeviceSecuritySnapshotEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = true)
    private String userId;

    @Column(nullable = false, length = 64, unique = true)
    private String checkId;

    @Column(nullable = false, length = 32)
    private String platform;

    @Column
    private String hostname;

    @Column(columnDefinition = "TEXT")
    private String primaryAntivirusName;

    @Column
    private Boolean realtimeEnabled;

    @Column
    private Boolean definitionsUpToDate;

    @Column(columnDefinition = "TEXT")
    private String rawJson;

    @Column(nullable = false)
    private Boolean allowed;

    @Column(columnDefinition = "TEXT")
    private String denyReason;

    @Column
    private LocalDateTime collectedAt;

    @Column(nullable = false)
    private LocalDateTime evaluatedAt;
}
