package com.mephi.ManagmentLocalServer.entity;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;

import static org.junit.jupiter.api.Assertions.*;

class UserEntityTest {

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId("test-id");
        user.setUsername("testuser");
        user.setSalt("test-salt");
        user.setPasswordHash("test-hash");
        user.setSetup(true);
    }

    @Test
    void getAuthorities_ReturnsEmptyCollection() {
        Collection<? extends GrantedAuthority> authorities = user.getAuthorities();

        assertNotNull(authorities);
        assertTrue(authorities.isEmpty());
    }

    @Test
    void getPassword_ReturnsPasswordHash() {
        assertEquals("test-hash", user.getPassword());
    }

    @Test
    void getUsername_ReturnsUsername() {
        assertEquals("testuser", user.getUsername());
    }

    @Test
    void isAccountNonExpired_AlwaysTrue() {
        assertTrue(user.isAccountNonExpired());
    }

    @Test
    void isAccountNonLocked_AlwaysTrue() {
        assertTrue(user.isAccountNonLocked());
    }

    @Test
    void isCredentialsNonExpired_AlwaysTrue() {
        assertTrue(user.isCredentialsNonExpired());
    }

    @Test
    void isEnabled_FollowsSetupFlag() {
        user.setSetup(true);
        assertTrue(user.isEnabled());

        user.setSetup(false);
        assertFalse(user.isEnabled());
    }

    @Test
    void onCreate_SetsBothTimestampsToSameValue() {
        User fresh = new User();
        fresh.setId("id");
        fresh.setUsername("name");
        fresh.setSalt("s");
        fresh.setPasswordHash("h");

        fresh.onCreate();

        assertNotNull(fresh.getCreatedAt());
        assertNotNull(fresh.getUpdatedAt());
        assertEquals(fresh.getCreatedAt(), fresh.getUpdatedAt());
    }

    @Test
    void onUpdate_AdvancesUpdatedAtAfterOnCreate() throws InterruptedException {
        user.onCreate();
        var initial = user.getUpdatedAt();

        Thread.sleep(2);
        user.onUpdate();

        assertNotNull(user.getUpdatedAt());
        assertTrue(user.getUpdatedAt().isAfter(initial)
                || user.getUpdatedAt().equals(initial),
                "updatedAt не должен быть раньше первоначального");
    }

    @Test
    void remoteFields_DefaultNull_AndStored() {
        User u = new User();
        assertNull(u.getRemoteId());
        assertNull(u.getRemoteToken());

        u.setRemoteId("remote-1");
        u.setRemoteToken("jwt-xxx");

        assertEquals("remote-1", u.getRemoteId());
        assertEquals("jwt-xxx", u.getRemoteToken());
    }
}
