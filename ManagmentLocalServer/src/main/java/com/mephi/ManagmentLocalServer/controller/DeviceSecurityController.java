package com.mephi.ManagmentLocalServer.controller;

import com.mephi.ManagmentLocalServer.dto.security.DeviceSecurityCheckRequest;
import com.mephi.ManagmentLocalServer.dto.security.SecurityCheckResponse;
import com.mephi.ManagmentLocalServer.entity.DeviceSecuritySnapshotEntity;
import com.mephi.ManagmentLocalServer.service.DeviceSecurityService;
import com.mephi.ManagmentLocalServer.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/security")
@RequiredArgsConstructor
@Tag(name = "🛡️ Device security", description = "Контроль состояния защищённости устройства")
public class DeviceSecurityController {

    private final DeviceSecurityService deviceSecurityService;
    private final UserService userService;

    @PostMapping("/check")
    public ResponseEntity<SecurityCheckResponse> check(@Valid @RequestBody DeviceSecurityCheckRequest request) {
        return ResponseEntity.ok(deviceSecurityService.evaluate(request));
    }

    @GetMapping("/policy")
    public ResponseEntity<Map<String, Object>> policy() {
        return ResponseEntity.ok(deviceSecurityService.policy());
    }

    @GetMapping("/history")
    public ResponseEntity<List<Map<String, Object>>> history() {
        try {
            userService.getCurrentUser();
        } catch (Exception e) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(
                deviceSecurityService.lastHistory().stream()
                        .map(this::toHistoryRow)
                        .collect(Collectors.toList())
        );
    }

    private Map<String, Object> toHistoryRow(DeviceSecuritySnapshotEntity e) {
        Map<String, Object> m = new HashMap<>();
        m.put("checkId", e.getCheckId());
        m.put("platform", e.getPlatform());
        m.put("primaryAntivirusName", e.getPrimaryAntivirusName());
        m.put("realtimeEnabled", e.getRealtimeEnabled());
        m.put("definitionsUpToDate", e.getDefinitionsUpToDate());
        m.put("allowed", e.getAllowed());
        m.put("denyReason", e.getDenyReason());
        m.put("collectedAt", e.getCollectedAt() != null ? e.getCollectedAt().toString() : null);
        m.put("evaluatedAt", e.getEvaluatedAt() != null ? e.getEvaluatedAt().toString() : null);
        return m;
    }
}
