package com.mephi.ManagmentLocalServer.config;

import com.mephi.ManagmentLocalServer.entity.User;
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
        testUser.setSetup(true);
    }

    @Test
    void generateToken_ValidUser_ReturnsThreePartToken() {
        String token = jwtService.generateToken(testUser);

        assertNotNull(token);
        assertFalse(token.isBlank());
        assertEquals(3, token.split("\\.").length);
    }

    @Test
    void extractUsername_ValidToken_ReturnsSubject() {
        String token = jwtService.generateToken(testUser);

        String username = jwtService.extractUsername(token);

        assertEquals("testuser", username);
    }

    @Test
    void isTokenValid_SameUser_ReturnsTrue() {
        String token = jwtService.generateToken(testUser);

        assertTrue(jwtService.isTokenValid(token, testUser));
    }

    @Test
    void isTokenValid_DifferentUsername_ReturnsFalse() {
        String token = jwtService.generateToken(testUser);

        User other = new User();
        other.setId("other-id");
        other.setUsername("otheruser");
        other.setSalt("salt");
        other.setPasswordHash("hash");
        other.setSetup(true);

        assertFalse(jwtService.isTokenValid(token, other));
    }

    @Test
    void isTokenValid_ExpiredToken_ThrowsExpiredJwtException() {
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", -1L);
        String token = jwtService.generateToken(testUser);

        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 3600000L);

        assertThrows(io.jsonwebtoken.ExpiredJwtException.class,
                () -> jwtService.isTokenValid(token, testUser));
    }

    @Test
    void generateToken_TwoCalls_ProduceTokensForSameSubject() {
        String t1 = jwtService.generateToken(testUser);
        String t2 = jwtService.generateToken(testUser);

        assertEquals(jwtService.extractUsername(t1), jwtService.extractUsername(t2));
        assertTrue(jwtService.isTokenValid(t1, testUser));
        assertTrue(jwtService.isTokenValid(t2, testUser));
    }
}
