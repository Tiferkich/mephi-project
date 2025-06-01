package com.mephi.ManagmentLocalServer.service;

import com.mephi.ManagmentLocalServer.dto.note.NoteRequest;
import com.mephi.ManagmentLocalServer.dto.note.NoteResponse;
import com.mephi.ManagmentLocalServer.entity.SecureNote;
import com.mephi.ManagmentLocalServer.entity.User;
import com.mephi.ManagmentLocalServer.repository.SecureNoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SecureNoteService {

    private final SecureNoteRepository noteRepository;
    private final UserService userService;

    public List<NoteResponse> getAllNotes() {
        User currentUser = userService.getCurrentUser();
        List<SecureNote> notes = noteRepository.findByUserOrderByUpdatedAtDesc(currentUser);
        
        return notes.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public NoteResponse createNote(NoteRequest request) {
        User currentUser = userService.getCurrentUser();
        
        SecureNote note = new SecureNote();
        note.setUser(currentUser);
        note.setEncryptedTitle(request.getEncryptedTitle());
        note.setEncryptedType(request.getEncryptedType());
        note.setEncryptedData(request.getEncryptedData());
        
        note = noteRepository.save(note);
        log.info("Created new note with id: {} for user: {}", note.getId(), currentUser.getUsername());
        
        return convertToResponse(note);
    }

    @Transactional
    public NoteResponse updateNote(Long id, NoteRequest request) {
        User currentUser = userService.getCurrentUser();
        
        SecureNote note = noteRepository.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new IllegalArgumentException("Note not found with id: " + id));
        
        note.setEncryptedTitle(request.getEncryptedTitle());
        note.setEncryptedType(request.getEncryptedType());
        note.setEncryptedData(request.getEncryptedData());
        // Сбрасываем время последней синхронизации, так как данные изменились
        note.setLastSyncAt(null);
        
        note = noteRepository.save(note);
        log.info("Updated note with id: {} for user: {}", note.getId(), currentUser.getUsername());
        
        return convertToResponse(note);
    }

    @Transactional
    public void deleteNote(Long id) {
        User currentUser = userService.getCurrentUser();
        
        SecureNote note = noteRepository.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new IllegalArgumentException("Note not found with id: " + id));
        
        noteRepository.delete(note);
        log.info("Deleted note with id: {} for user: {}", id, currentUser.getUsername());
    }

    public NoteResponse getNoteById(Long id) {
        User currentUser = userService.getCurrentUser();
        
        SecureNote note = noteRepository.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new IllegalArgumentException("Note not found with id: " + id));
        
        return convertToResponse(note);
    }

    // Методы для синхронизации
    public List<SecureNote> getUnsyncedNotes() {
        User currentUser = userService.getCurrentUser();
        return noteRepository.findModifiedSinceLastSync(currentUser);
    }

    @Transactional
    public void markAsSynced(Long noteId, String remoteId) {
        SecureNote note = noteRepository.findById(noteId)
                .orElseThrow(() -> new IllegalArgumentException("Note not found: " + noteId));
        
        note.setRemoteId(remoteId);
        note.setLastSyncAt(Instant.now());
        noteRepository.save(note);
        
        log.info("Note {} marked as synced with remoteId: {}", noteId, remoteId);
    }

    public int countUnsyncedNotes() {
        User currentUser = userService.getCurrentUser();
        return noteRepository.findUnsyncedByUser(currentUser).size();
    }

    public SecureNote createNoteFromRemote(String encryptedTitle, String encryptedType, 
                                         String encryptedData, String remoteId, Instant createdAt, Instant updatedAt) {
        User currentUser = userService.getCurrentUser();
        
        SecureNote note = new SecureNote();
        note.setUser(currentUser);
        note.setEncryptedTitle(encryptedTitle);
        note.setEncryptedType(encryptedType);
        note.setEncryptedData(encryptedData);
        note.setRemoteId(remoteId);
        note.setLastSyncAt(Instant.now());
        
        // Устанавливаем времена создания/обновления с удаленного сервера
        note.setCreatedAt(createdAt);
        note.setUpdatedAt(updatedAt);
        
        return noteRepository.save(note);
    }

    public List<SecureNote> getAllNotesForUser() {
        User currentUser = userService.getCurrentUser();
        return noteRepository.findByUser(currentUser);
    }

    public SecureNote saveNote(SecureNote note) {
        return noteRepository.save(note);
    }

    private NoteResponse convertToResponse(SecureNote note) {
        return new NoteResponse(
                note.getId(),
                note.getEncryptedTitle(),
                note.getEncryptedType(),
                note.getEncryptedData(),
                note.getRemoteId(),
                note.getCreatedAt(),
                note.getUpdatedAt(),
                note.getLastSyncAt()
        );
    }
} 