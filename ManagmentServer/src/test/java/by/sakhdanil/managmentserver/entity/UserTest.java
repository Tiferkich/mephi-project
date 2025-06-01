package by.sakhdanil.managmentserver.entity;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;

import static org.junit.jupiter.api.Assertions.*;

class UserTest {

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId("test-id");
        user.setUsername("testuser");
        user.setSalt("test-salt");
        user.setPasswordHash("test-hash");
    }

    @Test
    void getAuthorities_ReturnsEmptyList() {
        // When
        Collection<? extends GrantedAuthority> authorities = user.getAuthorities();

        // Then
        assertNotNull(authorities);
        assertTrue(authorities.isEmpty());
    }

    @Test
    void getPassword_ReturnsPasswordHash() {
        // When
        String password = user.getPassword();

        // Then
        assertEquals("test-hash", password);
    }

    @Test
    void getUsername_ReturnsUsername() {
        // When
        String username = user.getUsername();

        // Then
        assertEquals("testuser", username);
    }

    @Test
    void isAccountNonExpired_ReturnsTrue() {
        // When
        boolean isNonExpired = user.isAccountNonExpired();

        // Then
        assertTrue(isNonExpired);
    }

    @Test
    void isAccountNonLocked_ReturnsTrue() {
        // When
        boolean isNonLocked = user.isAccountNonLocked();

        // Then
        assertTrue(isNonLocked);
    }

    @Test
    void isCredentialsNonExpired_ReturnsTrue() {
        // When
        boolean isCredentialsNonExpired = user.isCredentialsNonExpired();

        // Then
        assertTrue(isCredentialsNonExpired);
    }

    @Test
    void isEnabled_ReturnsTrue() {
        // When
        boolean isEnabled = user.isEnabled();

        // Then
        assertTrue(isEnabled);
    }

    @Test
    void onCreate_SetsTimestamps() {
        // Given
        User newUser = new User();
        newUser.setUsername("newuser");
        newUser.setSalt("salt");
        newUser.setPasswordHash("hash");

        // When
        newUser.onCreate();

        // Then
        assertNotNull(newUser.getCreatedAt());
        assertNotNull(newUser.getUpdatedAt());
        assertEquals(newUser.getCreatedAt(), newUser.getUpdatedAt());
    }

    @Test
    void onUpdate_UpdatesTimestamp() throws InterruptedException {
        // Given
        user.onCreate();
        var originalUpdatedAt = user.getUpdatedAt();
        
        // Small delay to ensure different timestamp
        Thread.sleep(1);

        // When
        user.onUpdate();

        // Then
        assertNotNull(user.getUpdatedAt());
        assertTrue(user.getUpdatedAt().isAfter(originalUpdatedAt));
    }
} 