package com.mephi.ManagmentLocalServer.service;

import com.mephi.ManagmentLocalServer.dto.password.PasswordRequest;
import com.mephi.ManagmentLocalServer.dto.password.PasswordResponse;
import com.mephi.ManagmentLocalServer.entity.PasswordEntry;
import com.mephi.ManagmentLocalServer.entity.User;
import com.mephi.ManagmentLocalServer.repository.PasswordEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordEntryServiceTest {

    @Mock
    private PasswordEntryRepository passwordRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private PasswordEntryService passwordService;

    private User user;
    private PasswordEntry entry;
    private PasswordRequest request;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId("user-1");
        user.setUsername("alice");
        user.setSalt("salt");
        user.setPasswordHash("hash");
        user.setSetup(true);

        entry = new PasswordEntry();
        entry.setId(7L);
        entry.setUser(user);
        entry.setEncryptedTitle("t");
        entry.setEncryptedSite("s");
        entry.setEncryptedLogin("l");
        entry.setEncryptedPassword("p");
        entry.setEncryptedType("type");
        entry.setCreatedAt(Instant.now());
        entry.setUpdatedAt(Instant.now());

        request = new PasswordRequest("t", "s", "l", "p", "type");
    }

    @Test
    void getAllPasswords_ReturnsListOfResponses() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(passwordRepository.findByUserOrderByUpdatedAtDesc(user))
                .thenReturn(List.of(entry));

        List<PasswordResponse> result = passwordService.getAllPasswords();

        assertEquals(1, result.size());
        PasswordResponse r = result.get(0);
        assertEquals(7L, r.getId());
        assertEquals("t", r.getEncryptedTitle());
        assertEquals("s", r.getEncryptedSite());
        assertEquals("l", r.getEncryptedLogin());
        assertEquals("p", r.getEncryptedPassword());
        assertEquals("type", r.getEncryptedType());
        verify(passwordRepository).findByUserOrderByUpdatedAtDesc(user);
    }

    @Test
    void getAllPasswords_EmptyResult_ReturnsEmptyList() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(passwordRepository.findByUserOrderByUpdatedAtDesc(user))
                .thenReturn(List.of());

        List<PasswordResponse> result = passwordService.getAllPasswords();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void createPassword_AssignsCurrentUserAndSaves() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(passwordRepository.save(any(PasswordEntry.class))).thenReturn(entry);

        PasswordResponse result = passwordService.createPassword(request);

        assertNotNull(result);
        assertEquals(7L, result.getId());
        assertEquals("t", result.getEncryptedTitle());
        verify(passwordRepository).save(any(PasswordEntry.class));
    }

    @Test
    void getPasswordById_Existing_ReturnsResponse() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(passwordRepository.findByIdAndUser(7L, user)).thenReturn(Optional.of(entry));

        PasswordResponse result = passwordService.getPasswordById(7L);

        assertEquals(7L, result.getId());
        verify(passwordRepository).findByIdAndUser(7L, user);
    }

    @Test
    void getPasswordById_Missing_ThrowsIllegalArgumentException() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(passwordRepository.findByIdAndUser(99L, user)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> passwordService.getPasswordById(99L));
    }

    @Test
    void updatePassword_Existing_ResetsLastSyncAt_AndSaves() {
        entry.setLastSyncAt(Instant.now());
        when(userService.getCurrentUser()).thenReturn(user);
        when(passwordRepository.findByIdAndUser(7L, user)).thenReturn(Optional.of(entry));
        when(passwordRepository.save(any(PasswordEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        PasswordRequest upd = new PasswordRequest("nt", "ns", "nl", "np", "ntype");
        PasswordResponse result = passwordService.updatePassword(7L, upd);

        assertEquals("nt", result.getEncryptedTitle());
        assertEquals("ns", result.getEncryptedSite());
        assertEquals("nl", result.getEncryptedLogin());
        assertEquals("np", result.getEncryptedPassword());
        assertEquals("ntype", result.getEncryptedType());
        assertNull(entry.getLastSyncAt(), "lastSyncAt должен быть сброшен после обновления");
        verify(passwordRepository).save(entry);
    }

    @Test
    void updatePassword_Missing_ThrowsIllegalArgumentException() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(passwordRepository.findByIdAndUser(7L, user)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> passwordService.updatePassword(7L, request));
        verify(passwordRepository, never()).save(any(PasswordEntry.class));
    }

    @Test
    void deletePassword_Existing_DeletesViaRepository() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(passwordRepository.findByIdAndUser(7L, user)).thenReturn(Optional.of(entry));

        assertDoesNotThrow(() -> passwordService.deletePassword(7L));

        verify(passwordRepository).delete(entry);
    }

    @Test
    void deletePassword_Missing_ThrowsAndDoesNotDelete() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(passwordRepository.findByIdAndUser(7L, user)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> passwordService.deletePassword(7L));
        verify(passwordRepository, never()).delete(any(PasswordEntry.class));
    }

    @Test
    void markAsSynced_SetsRemoteIdAndLastSyncAt() {
        entry.setRemoteId(null);
        entry.setLastSyncAt(null);
        when(passwordRepository.findById(7L)).thenReturn(Optional.of(entry));
        when(passwordRepository.save(any(PasswordEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        passwordService.markAsSynced(7L, "remote-7");

        assertEquals("remote-7", entry.getRemoteId());
        assertNotNull(entry.getLastSyncAt());
        verify(passwordRepository).save(entry);
    }

    @Test
    void countUnsyncedPasswords_DelegatesToRepositoryAndReturnsSize() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(passwordRepository.findUnsyncedByUser(user)).thenReturn(List.of(entry, entry));

        int count = passwordService.countUnsyncedPasswords();

        assertEquals(2, count);
    }
}
