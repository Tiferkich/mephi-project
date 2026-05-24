package com.mephi.ManagmentLocalServer.service;

import com.mephi.ManagmentLocalServer.dto.note.NoteRequest;
import com.mephi.ManagmentLocalServer.dto.note.NoteResponse;
import com.mephi.ManagmentLocalServer.entity.SecureNote;
import com.mephi.ManagmentLocalServer.entity.User;
import com.mephi.ManagmentLocalServer.repository.SecureNoteRepository;
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

    @Mock
    private UserService userService;

    @InjectMocks
    private SecureNoteService noteService;

    private User user;
    private SecureNote note;
    private NoteRequest request;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId("user-1");
        user.setUsername("alice");
        user.setSalt("salt");
        user.setPasswordHash("hash");
        user.setSetup(true);

        note = new SecureNote();
        note.setId(11L);
        note.setUser(user);
        note.setEncryptedTitle("title");
        note.setEncryptedType("type");
        note.setEncryptedData("data");
        note.setCreatedAt(Instant.now());
        note.setUpdatedAt(Instant.now());

        request = new NoteRequest("title", "type", "data");
    }

    @Test
    void getAllNotes_ReturnsResponses() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(noteRepository.findByUserOrderByUpdatedAtDesc(user))
                .thenReturn(List.of(note));

        List<NoteResponse> result = noteService.getAllNotes();

        assertEquals(1, result.size());
        assertEquals(11L, result.get(0).getId());
        assertEquals("title", result.get(0).getEncryptedTitle());
        assertEquals("type", result.get(0).getEncryptedType());
        assertEquals("data", result.get(0).getEncryptedData());
    }

    @Test
    void createNote_PersistsForCurrentUser() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(noteRepository.save(any(SecureNote.class))).thenReturn(note);

        NoteResponse result = noteService.createNote(request);

        assertNotNull(result);
        assertEquals(11L, result.getId());
        verify(noteRepository).save(any(SecureNote.class));
    }

    @Test
    void getNoteById_Existing_Found() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(noteRepository.findByIdAndUser(11L, user)).thenReturn(Optional.of(note));

        NoteResponse result = noteService.getNoteById(11L);

        assertEquals(11L, result.getId());
    }

    @Test
    void getNoteById_Missing_ThrowsIllegalArgumentException() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(noteRepository.findByIdAndUser(99L, user)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> noteService.getNoteById(99L));
    }

    @Test
    void updateNote_Existing_ResetsLastSyncAt() {
        note.setLastSyncAt(Instant.now());
        when(userService.getCurrentUser()).thenReturn(user);
        when(noteRepository.findByIdAndUser(11L, user)).thenReturn(Optional.of(note));
        when(noteRepository.save(any(SecureNote.class))).thenAnswer(inv -> inv.getArgument(0));

        NoteRequest upd = new NoteRequest("new-title", "new-type", "new-data");
        NoteResponse result = noteService.updateNote(11L, upd);

        assertEquals("new-title", result.getEncryptedTitle());
        assertEquals("new-type", result.getEncryptedType());
        assertEquals("new-data", result.getEncryptedData());
        assertNull(note.getLastSyncAt());
    }

    @Test
    void updateNote_Missing_Throws() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(noteRepository.findByIdAndUser(11L, user)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> noteService.updateNote(11L, request));
        verify(noteRepository, never()).save(any(SecureNote.class));
    }

    @Test
    void deleteNote_Existing_DeletesEntity() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(noteRepository.findByIdAndUser(11L, user)).thenReturn(Optional.of(note));

        assertDoesNotThrow(() -> noteService.deleteNote(11L));

        verify(noteRepository).delete(note);
    }

    @Test
    void deleteNote_Missing_Throws() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(noteRepository.findByIdAndUser(11L, user)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> noteService.deleteNote(11L));
        verify(noteRepository, never()).delete(any(SecureNote.class));
    }

    @Test
    void markAsSynced_SetsRemoteIdAndLastSyncAt() {
        note.setRemoteId(null);
        note.setLastSyncAt(null);
        when(noteRepository.findById(11L)).thenReturn(Optional.of(note));
        when(noteRepository.save(any(SecureNote.class))).thenAnswer(inv -> inv.getArgument(0));

        noteService.markAsSynced(11L, "remote-11");

        assertEquals("remote-11", note.getRemoteId());
        assertNotNull(note.getLastSyncAt());
    }

    @Test
    void countUnsyncedNotes_ReturnsListSize() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(noteRepository.findUnsyncedByUser(user)).thenReturn(List.of(note));

        assertEquals(1, noteService.countUnsyncedNotes());
    }
}
