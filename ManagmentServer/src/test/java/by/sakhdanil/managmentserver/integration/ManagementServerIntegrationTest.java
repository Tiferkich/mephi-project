package by.sakhdanil.managmentserver.integration;

import by.sakhdanil.managmentserver.dto.note.NoteRequest;
import by.sakhdanil.managmentserver.dto.note.NoteResponse;
import by.sakhdanil.managmentserver.dto.user.JwtResponse;
import by.sakhdanil.managmentserver.dto.user.LoginRequest;
import by.sakhdanil.managmentserver.dto.user.RegisterRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase
@ActiveProfiles("test")
@Transactional
class ManagementServerIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void fullUserJourney_RegisterLoginCreateNote_Success() {
        // 1. Register a new user
        RegisterRequest registerRequest = new RegisterRequest("integrationuser", "salt123", "hash123");
        
        ResponseEntity<JwtResponse> registerResponse = restTemplate.postForEntity(
            "/api/auth/register", registerRequest, JwtResponse.class);
        
        assertEquals(HttpStatus.OK, registerResponse.getStatusCode());
        assertNotNull(registerResponse.getBody());
        assertNotNull(registerResponse.getBody().token());
        assertEquals("integrationuser", registerResponse.getBody().username());
        
        String token = registerResponse.getBody().token();

        // 2. Login with the same user
        LoginRequest loginRequest = new LoginRequest("integrationuser", "hash123");
        
        ResponseEntity<JwtResponse> loginResponse = restTemplate.postForEntity(
            "/api/auth/login", loginRequest, JwtResponse.class);
        
        assertEquals(HttpStatus.OK, loginResponse.getStatusCode());
        assertNotNull(loginResponse.getBody());
        assertNotNull(loginResponse.getBody().token());
        assertEquals("integrationuser", loginResponse.getBody().username());

        // 3. Create a note using the token
        NoteRequest noteRequest = new NoteRequest("encrypted-note-title", "encrypted-note-type", "encrypted-note-data");
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<NoteRequest> noteEntity = new HttpEntity<>(noteRequest, headers);
        
        ResponseEntity<NoteResponse> noteResponse = restTemplate.exchange(
            "/api/notes", HttpMethod.POST, noteEntity, NoteResponse.class);
        
        assertEquals(HttpStatus.OK, noteResponse.getStatusCode());
        assertNotNull(noteResponse.getBody());
        assertEquals("encrypted-note-title", noteResponse.getBody().encryptedTitle());
        assertEquals("encrypted-note-type", noteResponse.getBody().encryptedType());
        assertEquals("encrypted-note-data", noteResponse.getBody().encryptedData());

        // 4. Get all notes
        HttpEntity<Void> getEntity = new HttpEntity<>(headers);
        ResponseEntity<NoteResponse[]> getNotesResponse = restTemplate.exchange(
            "/api/notes", HttpMethod.GET, getEntity, NoteResponse[].class);
        
        assertEquals(HttpStatus.OK, getNotesResponse.getStatusCode());
        assertNotNull(getNotesResponse.getBody());
        assertTrue(getNotesResponse.getBody().length > 0);
        assertEquals("encrypted-note-title", getNotesResponse.getBody()[0].encryptedTitle());
        assertEquals("encrypted-note-type", getNotesResponse.getBody()[0].encryptedType());
        assertEquals("encrypted-note-data", getNotesResponse.getBody()[0].encryptedData());

        // 5. Export backup
        ResponseEntity<String> backupResponse = restTemplate.exchange(
            "/api/backup/export", HttpMethod.GET, getEntity, String.class);
        
        assertEquals(HttpStatus.OK, backupResponse.getStatusCode());
        assertNotNull(backupResponse.getBody());
        assertTrue(backupResponse.getBody().contains("notes"));
        assertTrue(backupResponse.getBody().contains("passwords"));
        assertTrue(backupResponse.getBody().contains("exportedAt"));
    }

    @Test
    void unauthorizedAccess_ReturnsForbidden() {
        // Try to access protected endpoint without token
        ResponseEntity<String> response1 = restTemplate.getForEntity("/api/notes", String.class);
        assertEquals(HttpStatus.FORBIDDEN, response1.getStatusCode());

        // Try to access with invalid token
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth("invalid-token");
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        
        ResponseEntity<String> response2 = restTemplate.exchange(
            "/api/notes", HttpMethod.GET, entity, String.class);
        assertEquals(HttpStatus.FORBIDDEN, response2.getStatusCode());
    }

    @Test
    void registerExistingUser_ReturnsError() {
        // Register first user
        RegisterRequest registerRequest = new RegisterRequest("duplicateuser", "salt123", "hash123");
        
        ResponseEntity<JwtResponse> firstResponse = restTemplate.postForEntity(
            "/api/auth/register", registerRequest, JwtResponse.class);
        assertEquals(HttpStatus.OK, firstResponse.getStatusCode());

        // Try to register same user again - Spring Security возвращает 403 для публичных эндпоинтов с ошибками
        ResponseEntity<String> secondResponse = restTemplate.postForEntity(
            "/api/auth/register", registerRequest, String.class);
        assertEquals(HttpStatus.FORBIDDEN, secondResponse.getStatusCode());
    }
} 