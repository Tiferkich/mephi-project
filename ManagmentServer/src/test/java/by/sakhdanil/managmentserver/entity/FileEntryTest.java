package by.sakhdanil.managmentserver.entity;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class FileEntryTest {

    @Test
    void builderDefaults_ScanStatusPending_AndZeroThreats() {
        FileEntry file = FileEntry.builder()
                .userId("u-1")
                .encryptedName("name-cipher")
                .encryptedMimeType("mime-cipher")
                .encryptedData(new byte[]{1, 2, 3})
                .originalSize(3L)
                .encryptedSize(48L)
                .checksum("a".repeat(64))
                .build();

        assertEquals(FileEntry.ScanStatus.PENDING, file.getScanStatus());
        assertEquals(0, file.getThreatsFound());
    }

    @Test
    void onCreate_SetsTimestamps() {
        FileEntry file = new FileEntry();
        file.setUserId("u-1");

        file.onCreate();

        assertNotNull(file.getCreatedAt());
        assertNotNull(file.getUpdatedAt());
        assertEquals(file.getCreatedAt(), file.getUpdatedAt());
    }

    @Test
    void onUpdate_AdvancesUpdatedAt() throws InterruptedException {
        FileEntry file = new FileEntry();
        file.onCreate();
        LocalDateTime initial = file.getUpdatedAt();

        Thread.sleep(2);
        file.onUpdate();

        assertNotNull(file.getUpdatedAt());
        assertTrue(file.getUpdatedAt().isAfter(initial)
                || file.getUpdatedAt().equals(initial));
    }

    @Test
    void scanStatusEnum_HasAllExpectedValues() {
        FileEntry.ScanStatus[] values = FileEntry.ScanStatus.values();
        assertEquals(5, values.length);
        assertNotNull(FileEntry.ScanStatus.valueOf("NOT_SCANNED"));
        assertNotNull(FileEntry.ScanStatus.valueOf("PENDING"));
        assertNotNull(FileEntry.ScanStatus.valueOf("CLEAN"));
        assertNotNull(FileEntry.ScanStatus.valueOf("INFECTED"));
        assertNotNull(FileEntry.ScanStatus.valueOf("ERROR"));
    }

    @Test
    void allFields_RoundTripViaSetters() {
        FileEntry file = new FileEntry();
        byte[] data = {10, 20, 30};
        file.setUserId("u-1");
        file.setEncryptedName("n");
        file.setEncryptedMimeType("m");
        file.setEncryptedData(data);
        file.setOriginalSize(3L);
        file.setEncryptedSize(48L);
        file.setChecksum("b".repeat(64));
        file.setScanStatus(FileEntry.ScanStatus.CLEAN);
        file.setThreatsFound(0);
        file.setVirusTotalAnalysisId("vt-1");

        assertEquals("u-1", file.getUserId());
        assertArrayEquals(data, file.getEncryptedData());
        assertEquals(FileEntry.ScanStatus.CLEAN, file.getScanStatus());
        assertEquals("vt-1", file.getVirusTotalAnalysisId());
    }
}
