package by.sakhdanil.managmentserver.entity;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class VaultGroupTest {

    @Test
    void onCreate_SetsCreatedAt() {
        VaultGroup group = new VaultGroup();
        group.setName("Team");

        group.onCreate();

        assertNotNull(group.getCreatedAt());
        assertTrue(group.getCreatedAt().isBefore(Instant.now().plusSeconds(1)));
    }

    @Test
    void members_DefaultEmpty() {
        VaultGroup group = new VaultGroup();

        assertNotNull(group.getMembers());
        assertTrue(group.getMembers().isEmpty());
    }

    @Test
    void allArgsConstructor_PopulatesFields() {
        User u = new User();
        u.setId("admin-1");
        Instant now = Instant.now();

        VaultGroup group = new VaultGroup("g-1", "Team", u, now, java.util.List.of());

        assertEquals("g-1", group.getId());
        assertEquals("Team", group.getName());
        assertSame(u, group.getCreatedBy());
        assertEquals(now, group.getCreatedAt());
    }
}
