package by.sakhdanil.managmentserver.controller;

import by.sakhdanil.managmentserver.dto.note.NoteRequest;
import by.sakhdanil.managmentserver.dto.note.NoteResponse;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.service.SecureNoteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NoteControllerUnitTest {

    @Mock
    private SecureNoteService noteService;

    @InjectMocks
    private NoteController noteController;

    private User testUser;
    private NoteRequest noteRequest;
    private NoteResponse noteResponse;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId("test-user-id");
        testUser.setUsername("testuser");

        noteRequest = new NoteRequest("encrypted-title", "encrypted-type", "encrypted-data");
        noteResponse = new NoteResponse(1L, "encrypted-title", "encrypted-type", "encrypted-data", Instant.now(), Instant.now());
    }

    @Test
    void getAllNotes_ReturnsNotesList() {
        // Given
        when(noteService.getAllNotes(any(User.class))).thenReturn(List.of(noteResponse));

        // When
        ResponseEntity<List<NoteResponse>> result = noteController.getAllNotes(testUser);

        // Then
        assertNotNull(result);
        assertEquals(200, result.getStatusCodeValue());
        assertNotNull(result.getBody());
        assertEquals(1, result.getBody().size());
        assertEquals(1L, result.getBody().get(0).id());
        assertEquals("encrypted-title", result.getBody().get(0).encryptedTitle());
        assertEquals("encrypted-type", result.getBody().get(0).encryptedType());
        assertEquals("encrypted-data", result.getBody().get(0).encryptedData());
    }

    @Test
    void createNote_ValidRequest_ReturnsNoteResponse() {
        // Given
        when(noteService.createNote(any(NoteRequest.class), any(User.class))).thenReturn(noteResponse);

        // When
        ResponseEntity<NoteResponse> result = noteController.createNote(noteRequest, testUser);

        // Then
        assertNotNull(result);
        assertEquals(200, result.getStatusCodeValue());
        assertNotNull(result.getBody());
        assertEquals(1L, result.getBody().id());
        assertEquals("encrypted-title", result.getBody().encryptedTitle());
        assertEquals("encrypted-type", result.getBody().encryptedType());
        assertEquals("encrypted-data", result.getBody().encryptedData());
    }

    @Test
    void deleteNote_ExistingNote_ReturnsNoContent() {
        // Given
        doNothing().when(noteService).deleteNote(eq(1L), any(User.class));

        // When
        ResponseEntity<Void> result = noteController.deleteNote(1L, testUser);

        // Then
        assertNotNull(result);
        assertEquals(204, result.getStatusCodeValue());
        assertNull(result.getBody());
    }
} 