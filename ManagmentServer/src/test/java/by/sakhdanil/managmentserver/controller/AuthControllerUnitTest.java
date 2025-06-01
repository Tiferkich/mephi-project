package by.sakhdanil.managmentserver.controller;

import by.sakhdanil.managmentserver.dto.user.JwtResponse;
import by.sakhdanil.managmentserver.dto.user.LoginRequest;
import by.sakhdanil.managmentserver.dto.user.RegisterRequest;
import by.sakhdanil.managmentserver.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerUnitTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private AuthController authController;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private JwtResponse jwtResponse;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest("testuser", "test-salt", "test-hash");
        loginRequest = new LoginRequest("testuser", "test-hash");
        jwtResponse = new JwtResponse("test-token", "test-id", "testuser");
    }

    @Test
    void register_ValidRequest_ReturnsJwtResponse() {
        // Given
        when(userService.register(any(RegisterRequest.class))).thenReturn(jwtResponse);

        // When
        ResponseEntity<JwtResponse> result = authController.register(registerRequest);

        // Then
        assertNotNull(result);
        assertEquals(200, result.getStatusCodeValue());
        assertNotNull(result.getBody());
        assertEquals("test-token", result.getBody().token());
        assertEquals("test-id", result.getBody().userId());
        assertEquals("testuser", result.getBody().username());
        assertEquals("Bearer", result.getBody().type());
    }

    @Test
    void login_ValidRequest_ReturnsJwtResponse() {
        // Given
        when(userService.login(any(LoginRequest.class))).thenReturn(jwtResponse);

        // When
        ResponseEntity<JwtResponse> result = authController.login(loginRequest);

        // Then
        assertNotNull(result);
        assertEquals(200, result.getStatusCodeValue());
        assertNotNull(result.getBody());
        assertEquals("test-token", result.getBody().token());
        assertEquals("test-id", result.getBody().userId());
        assertEquals("testuser", result.getBody().username());
        assertEquals("Bearer", result.getBody().type());
    }
} 