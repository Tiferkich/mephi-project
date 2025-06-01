package by.sakhdanil.managmentserver.service;

import by.sakhdanil.managmentserver.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;
    private User testUser;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", 
            "test-secret-key-which-should-be-at-least-256-bits-long-for-security-purposes");
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 3600000L);

        testUser = new User();
        testUser.setId("test-id");
        testUser.setUsername("testuser");
        testUser.setSalt("test-salt");
        testUser.setPasswordHash("test-hash");
    }

    @Test
    void generateToken_ValidUser_ReturnsToken() {
        // When
        String token = jwtService.generateToken(testUser);

        // Then
        assertNotNull(token);
        assertFalse(token.isEmpty());
        assertEquals(3, token.split("\\.").length); // JWT has 3 parts separated by dots
    }

    @Test
    void extractUsername_ValidToken_ReturnsUsername() {
        // Given
        String token = jwtService.generateToken(testUser);

        // When
        String username = jwtService.extractUsername(token);

        // Then
        assertEquals("testuser", username);
    }

    @Test
    void isTokenValid_ValidToken_ReturnsTrue() {
        // Given
        String token = jwtService.generateToken(testUser);

        // When
        boolean isValid = jwtService.isTokenValid(token, testUser);

        // Then
        assertTrue(isValid);
    }

    @Test
    void isTokenValid_DifferentUser_ReturnsFalse() {
        // Given
        String token = jwtService.generateToken(testUser);
        
        User differentUser = new User();
        differentUser.setUsername("differentuser");

        // When
        boolean isValid = jwtService.isTokenValid(token, differentUser);

        // Then
        assertFalse(isValid);
    }

    @Test
    void isTokenValid_ExpiredToken_ThrowsException() {
        // Given
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", -1L); // Expired immediately
        String token = jwtService.generateToken(testUser);

        // Reset expiration for validation
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 3600000L);

        // When & Then
        // Проверяем, что токен истек, ловя исключение
        assertThrows(io.jsonwebtoken.ExpiredJwtException.class, () -> {
            jwtService.isTokenValid(token, testUser);
        });
    }
} 