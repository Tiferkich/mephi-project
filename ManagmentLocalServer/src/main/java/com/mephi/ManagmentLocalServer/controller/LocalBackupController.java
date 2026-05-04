package com.mephi.ManagmentLocalServer.controller;

import com.mephi.ManagmentLocalServer.dto.auth.AuthResponse;
import com.mephi.ManagmentLocalServer.entity.User;
import com.mephi.ManagmentLocalServer.service.LocalBackupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/local-backup")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "LocalBackup", description = "Экспорт/импорт полного снимка vault (*.vault файл)")
public class LocalBackupController {

    private final LocalBackupService localBackupService;

    /**
     * Полный экспорт: пароли, заметки, файлы (base64) — данные, с которыми строится *.vault файл.
     * Требует JWT.
     */
    @GetMapping(value = "/export", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Полный экспорт (JWT)", security = @SecurityRequirement(name = "Bearer Authentication"))
    public ResponseEntity<Map<String, Object>> export(@AuthenticationPrincipal User user) {
        try {
            Map<String, Object> body = localBackupService.export(user);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            log.error("export failed: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Полный импорт. Публичный — как /auth/setup — принимает тело с user-блоком + securityCheckId.
     * Возвращает AuthResponse (JWT), пользователь сразу логинится.
     */
    @PostMapping(value = "/import", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Полный импорт из бэкапа (без JWT)")
    public ResponseEntity<?> importBackup(@RequestBody Map<String, Object> body) {
        try {
            AuthResponse auth = localBackupService.importBackup(body);
            return ResponseEntity.ok(auth);
        } catch (IllegalStateException e) {
            log.warn("import rejected: {}", e.getMessage());
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.warn("import bad request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("import failed: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
