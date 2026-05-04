package by.sakhdanil.managmentserver.controller;

import by.sakhdanil.managmentserver.dto.group.GroupNoteEntryResponse;
import by.sakhdanil.managmentserver.dto.group.GroupPasswordEntryResponse;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.service.GroupEntryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/groups/{groupId}/entries")
@RequiredArgsConstructor
@Tag(name = "📝 Group Entries", description = "Зашифрованные записи в групповых vault-хранилищах")
@SecurityRequirement(name = "Bearer Authentication")
public class GroupEntryController {

    private final GroupEntryService entryService;

    // ─────────────────────────── passwords ───────────────────────────────────

    @GetMapping("/passwords")
    @Operation(summary = "Получить все пароли группы (зашифрованы groupKey)")
    public ResponseEntity<List<GroupPasswordEntryResponse>> getPasswords(
            @PathVariable String groupId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(entryService.getPasswords(groupId, user));
    }

    @PostMapping("/passwords")
    @Operation(summary = "Создать запись пароля в группе (требуется WRITE)")
    public ResponseEntity<GroupPasswordEntryResponse> createPassword(
            @PathVariable String groupId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(entryService.createPassword(groupId, body, user));
    }

    @PutMapping("/passwords/{id}")
    @Operation(summary = "Обновить запись пароля (требуется WRITE)")
    public ResponseEntity<GroupPasswordEntryResponse> updatePassword(
            @PathVariable String groupId,
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(entryService.updatePassword(groupId, id, body, user));
    }

    @DeleteMapping("/passwords/{id}")
    @Operation(summary = "Удалить запись пароля (требуется WRITE)")
    public ResponseEntity<Void> deletePassword(
            @PathVariable String groupId,
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        entryService.deletePassword(groupId, id, user);
        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────── notes ───────────────────────────────────

    @GetMapping("/notes")
    @Operation(summary = "Получить все заметки группы (зашифрованы groupKey)")
    public ResponseEntity<List<GroupNoteEntryResponse>> getNotes(
            @PathVariable String groupId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(entryService.getNotes(groupId, user));
    }

    @PostMapping("/notes")
    @Operation(summary = "Создать заметку в группе (требуется WRITE)")
    public ResponseEntity<GroupNoteEntryResponse> createNote(
            @PathVariable String groupId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(entryService.createNote(groupId, body, user));
    }

    @PutMapping("/notes/{id}")
    @Operation(summary = "Обновить заметку (требуется WRITE)")
    public ResponseEntity<GroupNoteEntryResponse> updateNote(
            @PathVariable String groupId,
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(entryService.updateNote(groupId, id, body, user));
    }

    @DeleteMapping("/notes/{id}")
    @Operation(summary = "Удалить заметку (требуется WRITE)")
    public ResponseEntity<Void> deleteNote(
            @PathVariable String groupId,
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        entryService.deleteNote(groupId, id, user);
        return ResponseEntity.noContent().build();
    }
}
