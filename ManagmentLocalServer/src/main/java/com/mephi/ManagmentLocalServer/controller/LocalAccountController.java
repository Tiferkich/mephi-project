package com.mephi.ManagmentLocalServer.controller;

import com.mephi.ManagmentLocalServer.dto.auth.AuthResponse;
import com.mephi.ManagmentLocalServer.dto.auth.DeleteAccountRequest;
import com.mephi.ManagmentLocalServer.dto.auth.UpdateUsernameRequest;
import com.mephi.ManagmentLocalServer.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.Map;

/**
 * Операции с локальным аккаунтом. Требуют JWT (не в /auth/**).
 */
@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Local account", description = "Смена имени и удаление — только с валидным Bearer")
@SecurityRequirement(name = "Bearer Authentication")
public class LocalAccountController {

    private final UserService userService;

    @PatchMapping("/username")
    @Operation(
        summary = "Смена имени пользователя",
        description = "Проверяет мастер-пароль, возвращает новый JWT (в subject — новый username)"
    )
    public ResponseEntity<?> changeUsername(@Valid @RequestBody UpdateUsernameRequest request) {
        try {
            AuthResponse response = userService.changeUsername(
                    request.getNewUsername(),
                    request.getPasswordHash(),
                    request.getSecurityCheckId()
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/delete")
    @Operation(
        summary = "Полное удаление локального аккаунта",
        description = "Проверяет мастер-пароль, удаляет файлы, данные в БД и учётную запись"
    )
    public ResponseEntity<?> deleteAccount(@Valid @RequestBody DeleteAccountRequest request) {
        try {
            userService.deleteAccount(request.getPasswordHash(), request.getSecurityCheckId());
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(Map.of("message", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.status(500)
                    .body(Map.of("message", e.getMessage() != null ? e.getMessage() : "I/O error"));
        }
    }
}
