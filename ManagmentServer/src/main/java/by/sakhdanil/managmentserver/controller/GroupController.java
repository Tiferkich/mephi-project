package by.sakhdanil.managmentserver.controller;

import by.sakhdanil.managmentserver.dto.group.GroupMemberResponse;
import by.sakhdanil.managmentserver.dto.group.GroupResponse;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.service.GroupService;
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
@RequestMapping("/api/groups")
@RequiredArgsConstructor
@Tag(name = "👥 Groups", description = "Групповые vault-хранилища с E2E шифрованием")
@SecurityRequirement(name = "Bearer Authentication")
public class GroupController {

    private final GroupService groupService;

    // ─────────────────────────── group CRUD ──────────────────────────────────

    @GetMapping
    @Operation(summary = "Список групп текущего пользователя (с encrypted_group_key)")
    public ResponseEntity<List<GroupResponse>> getMyGroups(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(groupService.getMyGroups(user));
    }

    @PostMapping
    @Operation(summary = "Создать новую группу")
    public ResponseEntity<GroupResponse> createGroup(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {
        String name = body.get("name");
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(groupService.createGroup(name, user));
    }

    @PostMapping("/{id}/init")
    @Operation(summary = "Инициализировать группу: передать wrappedKey и adminPubKey для самого себя")
    public ResponseEntity<Void> initGroup(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {
        groupService.initGroup(id, body.get("encryptedGroupKey"), body.get("adminPubKey"), user);
        return ResponseEntity.ok().build();
    }

    // ─────────────────────────── invites ─────────────────────────────────────

    @PostMapping("/{id}/invites")
    @Operation(summary = "Пригласить пользователя по email (создаёт PENDING membership)")
    public ResponseEntity<Map<String, Object>> invite(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {
        groupService.inviteByEmail(id, body.get("email"), user);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ─────────────────────────── members ─────────────────────────────────────

    @GetMapping("/{id}/members")
    @Operation(summary = "Список всех участников группы")
    public ResponseEntity<List<GroupMemberResponse>> getMembers(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(groupService.getAllMembers(id, user));
    }

    @GetMapping("/{id}/members/pending")
    @Operation(summary = "Список PENDING участников (нужна передача ключа) — только для ADMIN")
    public ResponseEntity<List<GroupMemberResponse>> getPending(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(groupService.getPendingMembers(id, user));
    }

    @PutMapping("/{id}/members/{userId}")
    @Operation(summary = "Передать зашифрованный groupKey участнику (PENDING → ACTIVE)")
    public ResponseEntity<Void> deliverKey(
            @PathVariable String id,
            @PathVariable String userId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {
        groupService.deliverKey(id, userId, body.get("encryptedGroupKey"), body.get("adminPubKey"), user);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/members/{userId}/permission")
    @Operation(summary = "Изменить права участника: READ или WRITE (только ADMIN)")
    public ResponseEntity<Void> setPermission(
            @PathVariable String id,
            @PathVariable String userId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {
        groupService.setPermission(id, userId, body.get("permission"), user);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/members/{userId}")
    @Operation(summary = "Исключить участника из группы (только ADMIN)")
    public ResponseEntity<Void> removeMember(
            @PathVariable String id,
            @PathVariable String userId,
            @AuthenticationPrincipal User user) {
        groupService.removeMember(id, userId, user);
        return ResponseEntity.noContent().build();
    }
}
