package com.mephi.ManagmentLocalServer.controller;

import com.mephi.ManagmentLocalServer.dto.note.NoteRequest;
import com.mephi.ManagmentLocalServer.dto.note.NoteResponse;
import com.mephi.ManagmentLocalServer.service.SecureNoteService;
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
@RequestMapping("/notes")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "📝 Notes", description = "Управление зашифрованными заметками")
@SecurityRequirement(name = "Bearer Authentication")
public class NoteController {

    private final SecureNoteService noteService;

    @GetMapping
    @Operation(
        summary = "Получить все заметки",
        description = """
            Возвращает все зашифрованные заметки пользователя, отсортированные по времени обновления (новые первые).
            
            **Важно**: Все данные возвращаются в зашифрованном виде.
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Список заметок получен",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = NoteResponse.class),
                examples = @ExampleObject(
                    name = "Список заметок",
                    value = """
                        [
                          {
                            "id": 1,
                            "encryptedTitle": "U2FsdGVkX1+encrypted_title",
                            "encryptedType": "U2FsdGVkX1+encrypted_type",
                            "encryptedData": "U2FsdGVkX1+encrypted_content",
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
    public ResponseEntity<List<NoteResponse>> getAllNotes() {
        List<NoteResponse> notes = noteService.getAllNotes();
        return ResponseEntity.ok(notes);
    }

    @PostMapping
    @Operation(
        summary = "Создать новую заметку",
        description = """
            Создает новую зашифрованную заметку.
            
            **Важно**: Все поля должны быть зашифрованы на клиенте перед отправкой.
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "201",
            description = "Заметка создана",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = NoteResponse.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "Неверные данные"),
        @ApiResponse(responseCode = "401", description = "Не авторизован")
    })
    public ResponseEntity<NoteResponse> createNote(@Valid @RequestBody NoteRequest request) {
        NoteResponse note = noteService.createNote(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(note);
    }

    @PutMapping("/{id}")
    @Operation(
        summary = "Обновить заметку",
        description = """
            Обновляет существующую зашифрованную заметку.
            
            **Важно**: 
            - Заметка должна принадлежать текущему пользователю
            - Все поля должны быть зашифрованы на клиенте
            - Сбрасывает статус синхронизации
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Заметка обновлена",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = NoteResponse.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "Неверные данные"),
        @ApiResponse(responseCode = "401", description = "Не авторизован"),
        @ApiResponse(responseCode = "404", description = "Заметка не найдена")
    })
    public ResponseEntity<NoteResponse> updateNote(
            @PathVariable Long id,
            @Valid @RequestBody NoteRequest request
    ) {
        NoteResponse note = noteService.updateNote(id, request);
        return ResponseEntity.ok(note);
    }

    @DeleteMapping("/{id}")
    @Operation(
        summary = "Удалить заметку",
        description = """
            Удаляет заметку по ID.
            
            **Важно**: Заметка должна принадлежать текущему пользователю.
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Заметка удалена",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Успешное удаление",
                    value = """
                        {
                          "message": "Note deleted successfully",
                          "id": 1
                        }
                        """
                )
            )
        ),
        @ApiResponse(responseCode = "401", description = "Не авторизован"),
        @ApiResponse(responseCode = "404", description = "Заметка не найдена")
    })
    public ResponseEntity<Map<String, Object>> deleteNote(@PathVariable Long id) {
        noteService.deleteNote(id);
        return ResponseEntity.ok(Map.of(
            "message", "Note deleted successfully",
            "id", id
        ));
    }

    @GetMapping("/{id}")
    @Operation(
        summary = "Получить заметку по ID",
        description = """
            Возвращает конкретную заметку по её ID.
            
            **Важно**: Заметка должна принадлежать текущему пользователю.
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Заметка найдена",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = NoteResponse.class)
            )
        ),
        @ApiResponse(responseCode = "401", description = "Не авторизован"),
        @ApiResponse(responseCode = "404", description = "Заметка не найдена")
    })
    public ResponseEntity<NoteResponse> getNoteById(@PathVariable Long id) {
        NoteResponse note = noteService.getNoteById(id);
        return ResponseEntity.ok(note);
    }
} 