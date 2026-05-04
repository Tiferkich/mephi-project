package com.mephi.ManagmentLocalServer.repository;

import com.mephi.ManagmentLocalServer.entity.DeviceSecuritySnapshotEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeviceSecuritySnapshotRepository extends JpaRepository<DeviceSecuritySnapshotEntity, Long> {
    Optional<DeviceSecuritySnapshotEntity> findByCheckId(String checkId);

    List<DeviceSecuritySnapshotEntity> findTop20ByOrderByEvaluatedAtDesc();
}
