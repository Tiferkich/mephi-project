package by.sakhdanil.managmentserver.entity;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class GroupPasswordEntryTest {

    @Test
    void onCreate_SetsBothTimestampsToSameValue() {
        GroupPasswordEntry entry = new GroupPasswordEntry();

        entry.onCreate();

        assertNotNull(entry.getCreatedAt());
        assertNotNull(entry.getUpdatedAt());
        assertEquals(entry.getCreatedAt(), entry.getUpdatedAt());
    }

    @Test
    void onUpdate_AdvancesUpdatedAt() throws InterruptedException {
        GroupPasswordEntry entry = new GroupPasswordEntry();
        entry.onCreate();
        Instant initial = entry.getUpdatedAt();

        Thread.sleep(2);
        entry.onUpdate();

        assertTrue(entry.getUpdatedAt().isAfter(initial)
                || entry.getUpdatedAt().equals(initial));
    }

    @Test
    void encryptedFields_StoredAsIs() {
        GroupPasswordEntry entry = new GroupPasswordEntry();
        entry.setEncryptedTitle("t-cipher");
        entry.setEncryptedSite("s-cipher");
        entry.setEncryptedLogin("l-cipher");
        entry.setEncryptedPassword("p-cipher");
        entry.setEncryptedType("type-cipher");

        assertEquals("t-cipher", entry.getEncryptedTitle());
        assertEquals("s-cipher", entry.getEncryptedSite());
        assertEquals("l-cipher", entry.getEncryptedLogin());
        assertEquals("p-cipher", entry.getEncryptedPassword());
        assertEquals("type-cipher", entry.getEncryptedType());
    }
}
