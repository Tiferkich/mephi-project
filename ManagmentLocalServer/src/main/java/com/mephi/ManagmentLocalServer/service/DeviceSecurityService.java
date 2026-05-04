package com.mephi.ManagmentLocalServer.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mephi.ManagmentLocalServer.config.DeviceSecurityProperties;
import com.mephi.ManagmentLocalServer.dto.security.AntivirusProductDto;
import com.mephi.ManagmentLocalServer.dto.security.ClientDeviceSnapshotDto;
import com.mephi.ManagmentLocalServer.dto.security.DeviceSecurityCheckRequest;
import com.mephi.ManagmentLocalServer.dto.security.SecurityCheckResponse;
import com.mephi.ManagmentLocalServer.entity.DeviceSecuritySnapshotEntity;
import com.mephi.ManagmentLocalServer.exception.DeviceSecurityViolationException;
import com.mephi.ManagmentLocalServer.repository.DeviceSecuritySnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceSecurityService {

    private final DeviceSecurityProperties props;
    private final DeviceSecuritySnapshotRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public boolean isEnforce() {
        return props.isEnforce();
    }

    @Transactional
    public SecurityCheckResponse evaluate(DeviceSecurityCheckRequest request) {
        ClientDeviceSnapshotDto snap = request.getSnapshot();
        String checkId = UUID.randomUUID().toString();

        String rawJson;
        try {
            rawJson = objectMapper.writeValueAsString(snap);
        } catch (JsonProcessingException e) {
            rawJson = "{}";
        }

        String platform = Optional.ofNullable(snap.getPlatform()).orElse("unknown");
        String hostname = snap.getHostname();
        String providerVersion = Optional.ofNullable(snap.getProviderVersion()).orElse("");

        Map<String, Object> policyMap = buildPolicyMap();
        long ageSeconds = parseAgeSeconds(snap);

        if (ageSeconds > props.getMaxSnapshotAgeSeconds()) {
            return persistAndRespond(checkId, platform, hostname, null, null, null, null, rawJson, false, "STALE",
                    "Снимок устарел, выполните повторную проверку", policyMap);
        }

        if (!props.isEnforce()) {
            return persistAndRespond(checkId, platform, hostname, null, null, null, null, rawJson, true, null, null, policyMap);
        }

        if (props.isAllowStubProviders() && isStubOrNonWindows(platform, providerVersion)) {
            return persistAndRespond(checkId, platform, hostname, "stub", true, true, toCollectedAt(snap), rawJson, true, null, null, policyMap);
        }

        List<AntivirusProductDto> products = Optional.ofNullable(snap.getAntivirusProducts())
                .orElse(Collections.emptyList());
        if (products.isEmpty()) {
            return persistAndRespond(checkId, platform, hostname, null, false, null, toCollectedAt(snap), rawJson, false, "NO_AV",
                    "Не зарегистрирован продукт антивируса (WMI SecurityCenter2)", policyMap);
        }

        String primaryName = products.stream()
                .map(AntivirusProductDto::getName)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse("Unknown");

        boolean anyRealtime = products.stream()
                .anyMatch(p -> Boolean.TRUE.equals(p.getRealtimeProtection()));

        boolean allDefs = true;
        for (AntivirusProductDto p : products) {
            if (p.getDefinitionsUpToDate() != null && !p.getDefinitionsUpToDate()) {
                allDefs = false;
                break;
            }
        }

        if (props.isRequireRealtime() && !anyRealtime) {
            return persistAndRespond(checkId, platform, hostname, primaryName, false, allDefs, toCollectedAt(snap), rawJson, false, "ANTIVIRUS_OFF",
                    "Антивирусная защита в реальном времени отключена", policyMap);
        }
        if (props.isRequireUpToDate() && !allDefs) {
            return persistAndRespond(checkId, platform, hostname, primaryName, anyRealtime, false, toCollectedAt(snap), rawJson, false, "DEFS_OUTDATED",
                    "База сигнатур устарела (политика: require-up-to-date)", policyMap);
        }

        return persistAndRespond(checkId, platform, hostname, primaryName, anyRealtime, allDefs, toCollectedAt(snap), rawJson, true, null, null, policyMap);
    }

    private long parseAgeSeconds(ClientDeviceSnapshotDto snap) {
        if (snap.getCollectedAt() == null) {
            return Long.MAX_VALUE;
        }
        try {
            OffsetDateTime c = OffsetDateTime.parse(snap.getCollectedAt());
            return java.time.Duration.between(c, OffsetDateTime.now()).getSeconds();
        } catch (Exception e) {
            log.warn("Failed to parse collectedAt: {}", snap.getCollectedAt());
            return Long.MAX_VALUE;
        }
    }

    private LocalDateTime toCollectedAt(ClientDeviceSnapshotDto snap) {
        if (snap.getCollectedAt() == null) {
            return null;
        }
        try {
            return LocalDateTime.ofInstant(OffsetDateTime.parse(snap.getCollectedAt()).toInstant(), ZoneId.systemDefault());
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isStubOrNonWindows(String platform, String providerVersion) {
        if (platform == null) {
            return true;
        }
        if (!"win32".equalsIgnoreCase(platform)) {
            return true;
        }
        if ("web".equalsIgnoreCase(platform)) {
            return true;
        }
        String pv = providerVersion.toLowerCase(Locale.ROOT);
        return "stub".equals(pv) || "no-electron".equals(pv) || "web".equals(pv);
    }

    private Map<String, Object> buildPolicyMap() {
        return new LinkedHashMap<>(
                Map.of(
                        "enforce", props.isEnforce(),
                        "requireRealtime", props.isRequireRealtime(),
                        "requireUpToDate", props.isRequireUpToDate(),
                        "maxSnapshotAgeSeconds", props.getMaxSnapshotAgeSeconds(),
                        "allowStubProviders", props.isAllowStubProviders()
                ));
    }

    private SecurityCheckResponse persistAndRespond(
            String checkId,
            String platform,
            String hostname,
            String primaryName,
            Boolean realtime,
            Boolean defs,
            LocalDateTime collectedAt,
            String rawJson,
            boolean allowed,
            String errorCode,
            String message,
            Map<String, Object> policyMap) {
        String denyReason;
        if (!allowed) {
            denyReason = (message != null) ? message : (errorCode != null ? errorCode : "denied");
        } else {
            denyReason = null;
        }
        LocalDateTime now = LocalDateTime.now(ZoneId.systemDefault());
        DeviceSecuritySnapshotEntity e = DeviceSecuritySnapshotEntity.builder()
                .checkId(checkId)
                .userId(null)
                .platform(platform)
                .hostname(hostname)
                .primaryAntivirusName(primaryName)
                .realtimeEnabled(realtime)
                .definitionsUpToDate(defs)
                .rawJson(rawJson)
                .allowed(allowed)
                .denyReason(denyReason)
                .collectedAt(collectedAt)
                .evaluatedAt(now)
                .build();
        try {
            repository.save(e);
        } catch (Exception ex) {
            log.error("Failed to save device security snapshot: {}", ex.getMessage());
        }
        return SecurityCheckResponse.builder()
                .checkId(checkId)
                .allowed(allowed)
                .denyReason(allowed ? null : denyReason)
                .policy(policyMap)
                .build();
    }

    public Map<String, Object> policy() {
        return buildPolicyMap();
    }

    @Transactional(readOnly = true)
    public List<DeviceSecuritySnapshotEntity> lastHistory() {
        return repository.findTop20ByOrderByEvaluatedAtDesc();
    }

    @Transactional
    public void requireRecentAllowedCheck(String checkId) {
        if (!props.isEnforce()) {
            return;
        }
        if (checkId == null || checkId.isBlank()) {
            throw new DeviceSecurityViolationException("NO_CHECK", "Требуется идентификатор проверки безопасности (выполните /security/check)");
        }
        DeviceSecuritySnapshotEntity e = repository.findByCheckId(checkId)
                .orElseThrow(() -> new DeviceSecurityViolationException("UNKNOWN_CHECK", "Проверка не найдена, выполните предварительную проверку"));
        if (!Boolean.TRUE.equals(e.getAllowed())) {
            throw new DeviceSecurityViolationException("NOT_ALLOWED", Optional.ofNullable(e.getDenyReason()).orElse("Проверка не пройдена"));
        }
        int max = props.getMaxSnapshotAgeSeconds();
        LocalDateTime limit = LocalDateTime.now(ZoneId.systemDefault()).minusSeconds((long) max * 2);
        if (e.getEvaluatedAt() == null || e.getEvaluatedAt().isBefore(limit)) {
            throw new DeviceSecurityViolationException("EXPIRED", "Срок действия проверки истёк, выполните /security/check снова");
        }
    }
}
