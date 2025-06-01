package by.sakhdanil.managmentserver.service;

import by.sakhdanil.managmentserver.dto.note.NoteRequest;
import by.sakhdanil.managmentserver.dto.note.NoteResponse;
import by.sakhdanil.managmentserver.entity.SecureNote;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.repository.SecureNoteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SecureNoteServiceTest {

    @Mock
    private SecureNoteRepository noteRepository;

    @InjectMocks
    private SecureNoteService noteService;

    private User testUser;
    private SecureNote testNote;
    private NoteRequest noteRequest;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId("test-user-id");
        testUser.setUsername("testuser");

        testNote = new SecureNote();
        testNote.setId(1L);
        testNote.setUser(testUser);
        testNote.setEncryptedTitle("encrypted-test-title");
        testNote.setEncryptedType("encrypted-test-type");
        testNote.setEncryptedData("encrypted-test-data");
        testNote.setCreatedAt(Instant.now());
        testNote.setUpdatedAt(Instant.now());

        noteRequest = new NoteRequest("encrypted-test-title", "encrypted-test-type", "encrypted-test-data");
    }

    @Test
    void getAllNotes_UserHasNotes_ReturnsNotesList() {
        // Given
        List<SecureNote> notes = List.of(testNote);
        when(noteRepository.findByUser(testUser)).thenReturn(notes);

        // When
        List<NoteResponse> result = noteService.getAllNotes(testUser);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(testNote.getId(), result.get(0).id());
        assertEquals(testNote.getEncryptedTitle(), result.get(0).encryptedTitle());
        assertEquals(testNote.getEncryptedType(), result.get(0).encryptedType());
        assertEquals(testNote.getEncryptedData(), result.get(0).encryptedData());
        verify(noteRepository).findByUser(testUser);
    }

    @Test
    void getAllNotes_UserHasNoNotes_ReturnsEmptyList() {
        // Given
        when(noteRepository.findByUser(testUser)).thenReturn(List.of());

        // When
        List<NoteResponse> result = noteService.getAllNotes(testUser);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(noteRepository).findByUser(testUser);
    }

    @Test
    void createNote_ValidRequest_ReturnsNoteResponse() {
        // Given
        when(noteRepository.save(any(SecureNote.class))).thenReturn(testNote);

        // When
        NoteResponse result = noteService.createNote(noteRequest, testUser);

        // Then
        assertNotNull(result);
        assertEquals(testNote.getId(), result.id());
        assertEquals(testNote.getEncryptedType(), result.encryptedType());
        assertEquals(testNote.getEncryptedData(), result.encryptedData());
        verify(noteRepository).save(any(SecureNote.class));
    }

    @Test
    void updateNote_ExistingNote_ReturnsUpdatedNote() {
        // Given
        NoteRequest updateRequest = new NoteRequest("updated-encrypted-title", "updated-encrypted-type", "updated-encrypted-data");
        SecureNote updatedNote = new SecureNote();
        updatedNote.setId(1L);
        updatedNote.setUser(testUser);
        updatedNote.setEncryptedTitle("updated-encrypted-title");
        updatedNote.setEncryptedType("updated-encrypted-type");
        updatedNote.setEncryptedData("updated-encrypted-data");
        updatedNote.setCreatedAt(testNote.getCreatedAt());
        updatedNote.setUpdatedAt(Instant.now());

        when(noteRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.of(testNote));
        when(noteRepository.save(any(SecureNote.class))).thenReturn(updatedNote);

        // When
        NoteResponse result = noteService.updateNote(1L, updateRequest, testUser);

        // Then
        assertNotNull(result);
        assertEquals(1L, result.id());
        assertEquals("updated-encrypted-type", result.encryptedType());
        assertEquals("updated-encrypted-data", result.encryptedData());
        verify(noteRepository).findByIdAndUser(1L, testUser);
        verify(noteRepository).save(any(SecureNote.class));
    }

    @Test
    void updateNote_NonExistingNote_ThrowsException() {
        // Given
        NoteRequest updateRequest = new NoteRequest("updated-encrypted-title", "updated-encrypted-type", "updated-encrypted-data");
        when(noteRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.empty());

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class,
            () -> noteService.updateNote(1L, updateRequest, testUser));
        assertEquals("Note not found", exception.getMessage());
        verify(noteRepository).findByIdAndUser(1L, testUser);
        verify(noteRepository, never()).save(any(SecureNote.class));
    }

    @Test
    void deleteNote_ExistingNote_DeletesNote() {
        // Given
        when(noteRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.of(testNote));

        // When
        assertDoesNotThrow(() -> noteService.deleteNote(1L, testUser));

        // Then
        verify(noteRepository).findByIdAndUser(1L, testUser);
        verify(noteRepository).deleteByIdAndUser(1L, testUser);
    }

    @Test
    void deleteNote_NonExistingNote_ThrowsException() {
        // Given
        when(noteRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.empty());

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class,
            () -> noteService.deleteNote(1L, testUser));
        assertEquals("Note not found", exception.getMessage());
        verify(noteRepository).findByIdAndUser(1L, testUser);
        verify(noteRepository, never()).deleteByIdAndUser(anyLong(), any(User.class));
    }
} 