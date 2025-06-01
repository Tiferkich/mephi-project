package com.mephi.ManagmentLocalServer.controller;


import com.mephi.ManagmentLocalServer.dto.password.PasswordRequest;
import com.mephi.ManagmentLocalServer.dto.password.PasswordResponse;
import com.mephi.ManagmentLocalServer.service.PasswordEntryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/passwords")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "🔑 Passwords", description = "Управление зашифрованными паролями")
@SecurityRequirement(name = "Bearer Authentication")
public class PasswordController {

    private final PasswordEntryService passwordService;

    @GetMapping
    @Operation(
        summary = "Получить все пароли",
        description = """
            Возвращает все зашифрованные записи паролей пользователя, отсортированные по времени обновления (новые первые).
            
            **Важно**: Все данные возвращаются в зашифрованном виде.
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Список паролей получен",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = PasswordResponse.class),
                examples = @ExampleObject(
                    name = "Список паролей",
                    value = """
                        [
                          {
                            "id": 1,
                            "encryptedTitle": "U2FsdGVkX1+encrypted_title",
                            "encryptedSite": "U2FsdGVkX1+encrypted_site",
                            "encryptedLogin": "U2FsdGVkX1+encrypted_login",
                            "encryptedPassword": "U2FsdGVkX1+encrypted_password",
                            "encryptedType": "U2FsdGVkX1+encrypted_type",
                            "remoteId": "123e4567-e89b-12d3-a456-426614174000",
                            "createdAt": "2024-01-15T10:30:00Z",
                            "updatedAt": "2024-01-15T11:00:00Z",
                            "lastSyncAt": "2024-01-15T11:00:00Z"
                          }
                        ]
                        """
                )
            )
        ),
        @ApiResponse(responseCode = "401", description = "Не авторизован")
    })
    public ResponseEntity<List<PasswordResponse>> getAllPasswords() {
        List<PasswordResponse> passwords = passwordService.getAllPasswords();
        return ResponseEntity.ok(passwords);
    }

    @PostMapping
    @Operation(
        summary = "Создать новую запись пароля",
        description = """
            Создает новую зашифрованную запись пароля.
            
            **Важно**: Все поля должны быть зашифрованы на клиенте перед отправкой.
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "201",
            description = "Запись пароля создана",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = PasswordResponse.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "Неверные данные"),
        @ApiResponse(responseCode = "401", description = "Не авторизован")
    })
    public ResponseEntity<PasswordResponse> createPassword(@Valid @RequestBody PasswordRequest request) {
        PasswordResponse password = passwordService.createPassword(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(password);
    }

    @PutMapping("/{id}")
    @Operation(
        summary = "Обновить запись пароля",
        description = """
            Обновляет существующую зашифрованную запись пароля.
            
            **Важно**: 
            - Запись должна принадлежать текущему пользователю
            - Все поля должны быть зашифрованы на клиенте
            - Сбрасывает статус синхронизации
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Запись пароля обновлена",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = PasswordResponse.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "Неверные данные"),
        @ApiResponse(responseCode = "401", description = "Не авторизован"),
        @ApiResponse(responseCode = "404", description = "Запись пароля не найдена")
    })
    public ResponseEntity<PasswordResponse> updatePassword(
            @PathVariable Long id,
            @Valid @RequestBody PasswordRequest request
    ) {
        PasswordResponse password = passwordService.updatePassword(id, request);
        return ResponseEntity.ok(password);
    }

    @DeleteMapping("/{id}")
    @Operation(
        summary = "Удалить запись пароля",
        description = """
            Удаляет запись пароля по ID.
            
            **Важно**: Запись должна принадлежать текущему пользователю.
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Запись пароля удалена",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Успешное удаление",
                    value = """
                        {
                          "message": "Password entry deleted successfully",
                          "id": 1
                        }
                        """
                )
            )
        ),
        @ApiResponse(responseCode = "401", description = "Не авторизован"),
        @ApiResponse(responseCode = "404", description = "Запись пароля не найдена")
    })
    public ResponseEntity<Map<String, Object>> deletePassword(@PathVariable Long id) {
        passwordService.deletePassword(id);
        return ResponseEntity.ok(Map.of(
            "message", "Password entry deleted successfully",
            "id", id
        ));
    }

    @GetMapping("/{id}")
    @Operation(
        summary = "Получить запись пароля по ID",
        description = """
            Возвращает конкретную запись пароля по её ID.
            
            **Важно**: Запись должна принадлежать текущему пользователю.
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Запись пароля найдена",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = PasswordResponse.class)
            )
        ),
        @ApiResponse(responseCode = "401", description = "Не авторизован"),
        @ApiResponse(responseCode = "404", description = "Запись пароля не найдена")
    })
    public ResponseEntity<PasswordResponse> getPasswordById(@PathVariable Long id) {
        PasswordResponse password = passwordService.getPasswordById(id);
        return ResponseEntity.ok(password);
    }
} 