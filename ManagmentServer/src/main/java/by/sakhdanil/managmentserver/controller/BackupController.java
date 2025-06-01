package by.sakhdanil.managmentserver.controller;

import by.sakhdanil.managmentserver.dto.note.NoteResponse;
import by.sakhdanil.managmentserver.dto.password.PasswordResponse;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.service.PasswordEntryService;
import by.sakhdanil.managmentserver.service.SecureNoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/backup")
@RequiredArgsConstructor
@Tag(name = "💾 Backup", description = "Операции резервного копирования и восстановления данных")
public class BackupController {
    
    private final SecureNoteService noteService;
    private final PasswordEntryService passwordService;
    
    @GetMapping("/export")
    @Operation(
        summary = "Экспорт всех данных пользователя",
        description = """
            Экспортирует все зашифрованные данные пользователя (заметки и пароли) в формате JSON.
            
            **Важно**: 
            - Все данные остаются в зашифрованном виде
            - Экспорт включает метаданные: время создания, ID пользователя
            - Используйте для создания резервных копий или миграции данных
            - Данные можно сохранить локально на клиенте
            """,
        security = @SecurityRequirement(name = "Bearer Authentication")
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Данные успешно экспортированы",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Экспортированные данные",
                    value = """
                        {
                          "notes": [
                            {
                              "id": 1,
                              "encryptedTitle": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
                              "encryptedData": "AES_encrypted_note_content_1",
                              "createdAt": "2024-01-15T10:30:00.000Z",
                              "updatedAt": "2024-01-15T10:30:00.000Z"
                            }
                          ],
                          "passwords": [
                            {
                              "id": 1,
                              "encryptedTitle": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K2A=",
                              "encryptedData": "AES_encrypted_password_data_1",
                              "createdAt": "2024-01-15T10:30:00.000Z",
                              "updatedAt": "2024-01-15T10:30:00.000Z"
                            }
                          ],
                          "exportedAt": "2024-01-15T12:00:00.000Z",
                          "userId": "123e4567-e89b-12d3-a456-426614174000"
                        }
                        """
                )
            )
        ),
        @ApiResponse(responseCode = "401", description = "Не авторизован")
    })
    public ResponseEntity<Map<String, Object>> exportData(@AuthenticationPrincipal User user) {
        List<NoteResponse> notes = noteService.getAllNotes(user);
        List<PasswordResponse> passwords = passwordService.getAllPasswords(user);
        
        Map<String, Object> backup = new HashMap<>();
        backup.put("notes", notes);
        backup.put("passwords", passwords);
        backup.put("exportedAt", java.time.Instant.now());
        backup.put("userId", user.getId());
        
        return ResponseEntity.ok(backup);
    }
    
    @PostMapping("/import")
    @Operation(
        summary = "Импорт данных пользователя (в разработке)",
        description = """
            Импортирует данные пользователя из резервной копии.
            
            **Статус**: В разработке
            
            **Планируемая функциональность**:
            - Валидация формата данных
            - Обработка конфликтов с существующими записями
            - Опции слияния или замещения данных
            - Проверка целостности зашифрованных данных
            
            **Важно**: 
            - Данные должны быть в том же зашифрованном формате
            - Импорт будет доступен только для владельца данных
            """,
        security = @SecurityRequirement(name = "Bearer Authentication")
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Заглушка - функциональность в разработке",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Ответ заглушки",
                    value = """
                        {
                          "message": "Import functionality will be implemented based on specific requirements",
                          "status": "placeholder"
                        }
                        """
                )
            )
        ),
        @ApiResponse(responseCode = "400", description = "Неверный формат данных"),
        @ApiResponse(responseCode = "401", description = "Не авторизован")
    })
    public ResponseEntity<Map<String, String>> importData(
            @RequestBody Map<String, Object> backupData,
            @AuthenticationPrincipal User user) {
        // Здесь будет логика импорта данных
        // Пока что возвращаем заглушку
        Map<String, String> response = new HashMap<>();
        response.put("message", "Import functionality will be implemented based on specific requirements");
        response.put("status", "placeholder");
        return ResponseEntity.ok(response);
    }
} 