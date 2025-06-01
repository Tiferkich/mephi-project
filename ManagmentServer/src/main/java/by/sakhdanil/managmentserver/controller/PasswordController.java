package by.sakhdanil.managmentserver.controller;

import by.sakhdanil.managmentserver.dto.password.PasswordRequest;
import by.sakhdanil.managmentserver.dto.password.PasswordResponse;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.service.PasswordEntryService;
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
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/passwords")
@RequiredArgsConstructor
@Tag(name = "🔑 Passwords", description = "Управление зашифрованными записями паролей")
public class PasswordController {
    
    private final PasswordEntryService passwordService;
    
    @GetMapping
    @Operation(
        summary = "Получить все записи паролей пользователя",
        description = """
            Возвращает список всех зашифрованных записей паролей текущего пользователя.
            
            **Важно**: 
            - Все данные возвращаются в зашифрованном виде
            - Расшифровка происходит на клиенте с использованием мастер-пароля
            - Сервер не имеет доступа к содержимому паролей
            """,
        security = @SecurityRequirement(name = "Bearer Authentication")
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Список записей паролей успешно получен",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = PasswordResponse.class),
                examples = @ExampleObject(
                    name = "Список паролей",
                    value = """
                        [
                          {
                            "id": 1,
                            "encryptedTitle": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
                            "encryptedData": "AES_encrypted_password_data_1",
                            "createdAt": "2024-01-15T10:30:00.000Z",
                            "updatedAt": "2024-01-15T10:30:00.000Z"
                          },
                          {
                            "id": 2,
                            "encryptedTitle": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K2A=",
                            "encryptedData": "AES_encrypted_password_data_2",
                            "createdAt": "2024-01-15T11:00:00.000Z",
                            "updatedAt": "2024-01-15T11:00:00.000Z"
                          }
                        ]
                        """
                )
            )
        ),
        @ApiResponse(responseCode = "401", description = "Не авторизован")
    })
    public ResponseEntity<List<PasswordResponse>> getAllPasswords(@AuthenticationPrincipal User user) {
        List<PasswordResponse> passwords = passwordService.getAllPasswords(user);
        return ResponseEntity.ok(passwords);
    }
    
    @PostMapping
    @Operation(
        summary = "Создать новую запись пароля",
        description = """
            Создает новую зашифрованную запись пароля для текущего пользователя.
            
            **Важно**: 
            - Данные должны быть зашифрованы на клиенте перед отправкой
            - Включите в зашифрованные данные: название сайта, логин, пароль, заметки
            - Используйте мастер-пароль для генерации ключа шифрования
            """,
        security = @SecurityRequirement(name = "Bearer Authentication")
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Запись пароля успешно создана",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = PasswordResponse.class),
                examples = @ExampleObject(
                    name = "Созданная запись",
                    value = """
                        {
                          "id": 1,
                          "encryptedTitle": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
                          "encryptedData": "AES_encrypted_password_data",
                          "createdAt": "2024-01-15T10:30:00.000Z",
                          "updatedAt": "2024-01-15T10:30:00.000Z"
                        }
                        """
                )
            )
        ),
        @ApiResponse(responseCode = "400", description = "Неверные данные запроса"),
        @ApiResponse(responseCode = "401", description = "Не авторизован")
    })
    public ResponseEntity<PasswordResponse> createPassword(
            @Valid @RequestBody PasswordRequest request,
            @AuthenticationPrincipal User user) {
        PasswordResponse password = passwordService.createPassword(request, user);
        return ResponseEntity.ok(password);
    }
    
    @PutMapping("/{id}")
    @Operation(
        summary = "Обновить запись пароля",
        description = """
            Обновляет существующую запись пароля пользователя.
            
            **Важно**: 
            - Можно обновлять только свои записи
            - Новые данные должны быть зашифрованы на клиенте
            - ID записи должен существовать и принадлежать текущему пользователю
            """,
        security = @SecurityRequirement(name = "Bearer Authentication")
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Запись пароля успешно обновлена",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = PasswordResponse.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "Неверные данные запроса"),
        @ApiResponse(responseCode = "401", description = "Не авторизован"),
        @ApiResponse(responseCode = "404", description = "Запись не найдена или не принадлежит пользователю")
    })
    public ResponseEntity<PasswordResponse> updatePassword(
            @PathVariable Long id,
            @Valid @RequestBody PasswordRequest request,
            @AuthenticationPrincipal User user) {
        PasswordResponse password = passwordService.updatePassword(id, request, user);
        return ResponseEntity.ok(password);
    }
    
    @DeleteMapping("/{id}")
    @Operation(
        summary = "Удалить запись пароля",
        description = """
            Удаляет запись пароля пользователя.
            
            **Важно**: 
            - Можно удалять только свои записи
            - Операция необратима
            - ID записи должен существовать и принадлежать текущему пользователю
            """,
        security = @SecurityRequirement(name = "Bearer Authentication")
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Запись пароля успешно удалена"),
        @ApiResponse(responseCode = "401", description = "Не авторизован"),
        @ApiResponse(responseCode = "404", description = "Запись не найдена или не принадлежит пользователю")
    })
    public ResponseEntity<Void> deletePassword(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        passwordService.deletePassword(id, user);
        return ResponseEntity.noContent().build();
    }
} 