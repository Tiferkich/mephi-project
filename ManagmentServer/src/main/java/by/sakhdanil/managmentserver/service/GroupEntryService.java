package by.sakhdanil.managmentserver.service;

import by.sakhdanil.managmentserver.dto.group.GroupNoteEntryResponse;
import by.sakhdanil.managmentserver.dto.group.GroupPasswordEntryResponse;
import by.sakhdanil.managmentserver.entity.*;
import by.sakhdanil.managmentserver.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GroupEntryService {

    private final GroupService groupService;
    private final GroupPasswordEntryRepository passwordRepo;
    private final GroupNoteEntryRepository noteRepo;

    // ─────────────────────────── passwords ───────────────────────────────────

    @Transactional(readOnly = true)
    public List<GroupPasswordEntryResponse> getPasswords(String groupId, User user) {
        VaultGroup group = groupService.findGroupOrThrow(groupId);
        groupService.requireMember(group, user);
        return passwordRepo.findByGroup(group).stream().map(this::toPasswordResponse).toList();
    }

    @Transactional
    public GroupPasswordEntryResponse createPassword(String groupId, Map<String, String> body, User user) {
        VaultGroup group = groupService.findGroupOrThrow(groupId);
        groupService.requireWrite(group, user);

        GroupPasswordEntry e = new GroupPasswordEntry();
        e.setGroup(group);
        e.setCreatedBy(user);
        e.setEncryptedTitle(body.get("encryptedTitle"));
        e.setEncryptedSite(body.get("encryptedSite"));
        e.setEncryptedLogin(body.get("encryptedLogin"));
        e.setEncryptedPassword(body.get("encryptedPassword"));
        e.setEncryptedType(body.get("encryptedType"));
        return toPasswordResponse(passwordRepo.save(e));
    }

    @Transactional
    public GroupPasswordEntryResponse updatePassword(String groupId, Long entryId,
                                                     Map<String, String> body, User user) {
        VaultGroup group = groupService.findGroupOrThrow(groupId);
        groupService.requireWrite(group, user);

        GroupPasswordEntry e = passwordRepo.findById(entryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found"));
        if (!e.getGroup().getId().equals(groupId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found in this group");
        }

        e.setEncryptedTitle(body.get("encryptedTitle"));
        e.setEncryptedSite(body.get("encryptedSite"));
        e.setEncryptedLogin(body.get("encryptedLogin"));
        e.setEncryptedPassword(body.get("encryptedPassword"));
        e.setEncryptedType(body.get("encryptedType"));
        return toPasswordResponse(passwordRepo.save(e));
    }

    @Transactional
    public void deletePassword(String groupId, Long entryId, User user) {
        VaultGroup group = groupService.findGroupOrThrow(groupId);
        groupService.requireWrite(group, user);

        GroupPasswordEntry e = passwordRepo.findById(entryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found"));
        if (!e.getGroup().getId().equals(groupId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found in this group");
        }
        passwordRepo.delete(e);
    }

    // ─────────────────────────────── notes ───────────────────────────────────

    @Transactional(readOnly = true)
    public List<GroupNoteEntryResponse> getNotes(String groupId, User user) {
        VaultGroup group = groupService.findGroupOrThrow(groupId);
        groupService.requireMember(group, user);
        return noteRepo.findByGroup(group).stream().map(this::toNoteResponse).toList();
    }

    @Transactional
    public GroupNoteEntryResponse createNote(String groupId, Map<String, String> body, User user) {
        VaultGroup group = groupService.findGroupOrThrow(groupId);
        groupService.requireWrite(group, user);

        GroupNoteEntry e = new GroupNoteEntry();
        e.setGroup(group);
        e.setCreatedBy(user);
        e.setEncryptedTitle(body.get("encryptedTitle"));
        e.setEncryptedType(body.get("encryptedType"));
        e.setEncryptedData(body.get("encryptedData"));
        return toNoteResponse(noteRepo.save(e));
    }

    @Transactional
    public GroupNoteEntryResponse updateNote(String groupId, Long entryId,
                                             Map<String, String> body, User user) {
        VaultGroup group = groupService.findGroupOrThrow(groupId);
        groupService.requireWrite(group, user);

        GroupNoteEntry e = noteRepo.findById(entryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found"));
        if (!e.getGroup().getId().equals(groupId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found in this group");
        }

        e.setEncryptedTitle(body.get("encryptedTitle"));
        e.setEncryptedType(body.get("encryptedType"));
        e.setEncryptedData(body.get("encryptedData"));
        return toNoteResponse(noteRepo.save(e));
    }

    @Transactional
    public void deleteNote(String groupId, Long entryId, User user) {
        VaultGroup group = groupService.findGroupOrThrow(groupId);
        groupService.requireWrite(group, user);

        GroupNoteEntry e = noteRepo.findById(entryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found"));
        if (!e.getGroup().getId().equals(groupId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found in this group");
        }
        noteRepo.delete(e);
    }

    // ─────────────────────────────── mappers ─────────────────────────────────

    private GroupPasswordEntryResponse toPasswordResponse(GroupPasswordEntry e) {
        return new GroupPasswordEntryResponse(
                e.getId(), e.getGroup().getId(), e.getCreatedBy().getId(),
                e.getEncryptedTitle(), e.getEncryptedSite(), e.getEncryptedLogin(),
                e.getEncryptedPassword(), e.getEncryptedType(),
                e.getCreatedAt(), e.getUpdatedAt());
    }

    private GroupNoteEntryResponse toNoteResponse(GroupNoteEntry e) {
        return new GroupNoteEntryResponse(
                e.getId(), e.getGroup().getId(), e.getCreatedBy().getId(),
                e.getEncryptedTitle(), e.getEncryptedType(), e.getEncryptedData(),
                e.getCreatedAt(), e.getUpdatedAt());
    }
}
