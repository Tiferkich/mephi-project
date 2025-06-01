package by.sakhdanil.managmentserver.controller;

import by.sakhdanil.managmentserver.dto.note.NoteRequest;
import by.sakhdanil.managmentserver.dto.note.NoteResponse;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.service.SecureNoteService;
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
@RequestMapping("/api/notes")
@RequiredArgsConstructor
@Tag(name = "📝 Notes", description = "Управление зашифрованными заметками")
public class NoteController {
    
    private final SecureNoteService noteService;
    
    @GetMapping
    @Operation(
        summary = "Получить все заметки пользователя",
        description = """
            Возвращает список всех зашифрованных заметок текущего пользователя.
            
            **Важно**: 
            - Все данные возвращаются в зашифрованном виде
            - Расшифровка происходит на клиенте с использованием мастер-пароля
            - Сервер не имеет доступа к содержимому заметок
            """,
        security = @SecurityRequirement(name = "Bearer Authentication")
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Список заметок успешно получен",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = NoteResponse.class),
                examples = @ExampleObject(
                    name = "Список заметок",
                    value = """
                        [
                          {
                            "id": 1,
                            "encryptedTitle": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
                            "encryptedData": "AES_encrypted_note_content_1",
                            "createdAt": "2024-01-15T10:30:00.000Z",
                            "updatedAt": "2024-01-15T10:30:00.000Z"
                          },
                          {
                            "id": 2,
                            "encryptedTitle": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K2A=",
                            "encryptedData": "AES_encrypted_note_content_2",
                            "createdAt": "2024-01-15T11:00:00.000Z",
                            "updatedAt": "2024-01-15T11:00:00.000Z"
                          }
                        ]
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Не авторизован - отсутствует или недействительный JWT токен"
        )
    })
    public ResponseEntity<List<NoteResponse>> getAllNotes(@AuthenticationPrincipal User user) {
        List<NoteResponse> notes = noteService.getAllNotes(user);
        return ResponseEntity.ok(notes);
    }
    
    @PostMapping
    @Operation(
        summary = "Создать новую заметку",
        description = """
            Создает новую зашифрованную заметку для текущего пользователя.
            
            **Важно**: 
            - Данные должны быть зашифрованы на клиенте перед отправкой
            - Используйте мастер-пароль для генерации ключа шифрования
            - Сервер сохраняет только зашифрованные данные
            """,
        security = @SecurityRequirement(name = "Bearer Authentication")
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Заметка успешно создана",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = NoteResponse.class),
                examples = @ExampleObject(
                    name = "Созданная заметка",
                    value = """
                        {
                          "id": 1,
                          "encryptedTitle": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
                          "encryptedData": "AES_encrypted_note_content",
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
    public ResponseEntity<NoteResponse> createNote(
            @Valid @RequestBody NoteRequest request,
            @AuthenticationPrincipal User user) {
        NoteResponse note = noteService.createNote(request, user);
        return ResponseEntity.ok(note);
    }
    
    @PutMapping("/{id}")
    @Operation(
        summary = "Обновить заметку",
        description = """
            Обновляет существующую заметку пользователя.
            
            **Важно**: 
            - Можно обновлять только свои заметки
            - Новые данные должны быть зашифрованы на клиенте
            - ID заметки должен существовать и принадлежать текущему пользователю
            """,
        security = @SecurityRequirement(name = "Bearer Authentication")
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Заметка успешно обновлена",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = NoteResponse.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "Неверные данные запроса"),
        @ApiResponse(responseCode = "401", description = "Не авторизован"),
        @ApiResponse(responseCode = "404", description = "Заметка не найдена или не принадлежит пользователю")
    })
    public ResponseEntity<NoteResponse> updateNote(
            @PathVariable Long id,
            @Valid @RequestBody NoteRequest request,
            @AuthenticationPrincipal User user) {
        NoteResponse note = noteService.updateNote(id, request, user);
        return ResponseEntity.ok(note);
    }
    
    @DeleteMapping("/{id}")
    @Operation(
        summary = "Удалить заметку",
        description = """
            Удаляет заметку пользователя.
            
            **Важно**: 
            - Можно удалять только свои заметки
            - Операция необратима
            - ID заметки должен существовать и принадлежать текущему пользователю
            """,
        security = @SecurityRequirement(name = "Bearer Authentication")
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Заметка успешно удалена"),
        @ApiResponse(responseCode = "401", description = "Не авторизован"),
        @ApiResponse(responseCode = "404", description = "Заметка не найдена или не принадлежит пользователю")
    })
    public ResponseEntity<Void> deleteNote(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        noteService.deleteNote(id, user);
        return ResponseEntity.noContent().build();
    }
} 