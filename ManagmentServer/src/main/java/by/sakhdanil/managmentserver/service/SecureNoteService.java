package by.sakhdanil.managmentserver.service;

import by.sakhdanil.managmentserver.dto.note.NoteRequest;
import by.sakhdanil.managmentserver.dto.note.NoteResponse;
import by.sakhdanil.managmentserver.entity.SecureNote;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.repository.SecureNoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class SecureNoteService {
    
    private final SecureNoteRepository noteRepository;
    
    public List<NoteResponse> getAllNotes(User user) {
        return noteRepository.findByUser(user)
            .stream()
            .map(this::toResponse)
            .toList();
    }
    
    public NoteResponse createNote(NoteRequest request, User user) {
        SecureNote note = new SecureNote();
        note.setUser(user);
        note.setEncryptedTitle(request.encryptedTitle());
        note.setEncryptedType(request.encryptedType());
        note.setEncryptedData(request.encryptedData());
        
        SecureNote savedNote = noteRepository.save(note);
        return toResponse(savedNote);
    }
    
    public NoteResponse updateNote(Long id, NoteRequest request, User user) {
        SecureNote note = noteRepository.findByIdAndUser(id, user)
            .orElseThrow(() -> new RuntimeException("Note not found"));
        
        note.setEncryptedTitle(request.encryptedTitle());
        note.setEncryptedType(request.encryptedType());
        note.setEncryptedData(request.encryptedData());
        SecureNote savedNote = noteRepository.save(note);
        return toResponse(savedNote);
    }
    
    public void deleteNote(Long id, User user) {
        if (!noteRepository.findByIdAndUser(id, user).isPresent()) {
            throw new RuntimeException("Note not found");
        }
        noteRepository.deleteByIdAndUser(id, user);
    }
    
    private NoteResponse toResponse(SecureNote note) {
        return new NoteResponse(
            note.getId(),
            note.getEncryptedTitle(),
            note.getEncryptedType(),
            note.getEncryptedData(),
            note.getCreatedAt(),
            note.getUpdatedAt()
        );
    }
} 