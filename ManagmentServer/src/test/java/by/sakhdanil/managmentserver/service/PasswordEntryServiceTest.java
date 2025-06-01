package by.sakhdanil.managmentserver.service;

import by.sakhdanil.managmentserver.dto.password.PasswordRequest;
import by.sakhdanil.managmentserver.dto.password.PasswordResponse;
import by.sakhdanil.managmentserver.entity.PasswordEntry;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.repository.PasswordEntryRepository;
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

    @InjectMocks
    private PasswordEntryService passwordService;

    private User testUser;
    private PasswordEntry testPassword;
    private PasswordRequest passwordRequest;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId("test-user-id");
        testUser.setUsername("testuser");

        testPassword = new PasswordEntry();
        testPassword.setId(1L);
        testPassword.setUser(testUser);
        testPassword.setEncryptedTitle("encrypted-password-title");
        testPassword.setEncryptedSite("encrypted-site");
        testPassword.setEncryptedLogin("encrypted-login");
        testPassword.setEncryptedPassword("encrypted-password");
        testPassword.setEncryptedType("encrypted-type");
        testPassword.setCreatedAt(Instant.now());
        testPassword.setUpdatedAt(Instant.now());

        passwordRequest = new PasswordRequest(
            "encrypted-password-title",
            "encrypted-site",
            "encrypted-login", 
            "encrypted-password",
            "encrypted-type"
        );
    }

    @Test
    void getAllPasswords_UserHasPasswords_ReturnsPasswordsList() {
        // Given
        List<PasswordEntry> passwords = List.of(testPassword);
        when(passwordRepository.findByUser(testUser)).thenReturn(passwords);

        // When
        List<PasswordResponse> result = passwordService.getAllPasswords(testUser);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(testPassword.getId(), result.get(0).id());
        assertEquals(testPassword.getEncryptedTitle(), result.get(0).encryptedTitle());
        assertEquals(testPassword.getEncryptedSite(), result.get(0).encryptedSite());
        assertEquals(testPassword.getEncryptedLogin(), result.get(0).encryptedLogin());
        assertEquals(testPassword.getEncryptedPassword(), result.get(0).encryptedPassword());
        assertEquals(testPassword.getEncryptedType(), result.get(0).encryptedType());
        verify(passwordRepository).findByUser(testUser);
    }

    @Test
    void getAllPasswords_UserHasNoPasswords_ReturnsEmptyList() {
        // Given
        when(passwordRepository.findByUser(testUser)).thenReturn(List.of());

        // When
        List<PasswordResponse> result = passwordService.getAllPasswords(testUser);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(passwordRepository).findByUser(testUser);
    }

    @Test
    void createPassword_ValidRequest_ReturnsPasswordResponse() {
        // Given
        when(passwordRepository.save(any(PasswordEntry.class))).thenReturn(testPassword);

        // When
        PasswordResponse result = passwordService.createPassword(passwordRequest, testUser);

        // Then
        assertNotNull(result);
        assertEquals(testPassword.getId(), result.id());
        assertEquals(testPassword.getEncryptedSite(), result.encryptedSite());
        assertEquals(testPassword.getEncryptedLogin(), result.encryptedLogin());
        assertEquals(testPassword.getEncryptedPassword(), result.encryptedPassword());
        assertEquals(testPassword.getEncryptedType(), result.encryptedType());
        verify(passwordRepository).save(any(PasswordEntry.class));
    }

    @Test
    void updatePassword_ExistingPassword_ReturnsUpdatedPassword() {
        // Given
        PasswordRequest updateRequest = new PasswordRequest(
            "updated-encrypted-title",
            "updated-encrypted-site",
            "updated-encrypted-login",
            "updated-encrypted-password",
            "updated-encrypted-type"
        );
        PasswordEntry updatedPassword = new PasswordEntry();
        updatedPassword.setId(1L);
        updatedPassword.setUser(testUser);
        updatedPassword.setEncryptedTitle("updated-encrypted-title");
        updatedPassword.setEncryptedSite("updated-encrypted-site");
        updatedPassword.setEncryptedLogin("updated-encrypted-login");
        updatedPassword.setEncryptedPassword("updated-encrypted-password");
        updatedPassword.setEncryptedType("updated-encrypted-type");
        updatedPassword.setCreatedAt(testPassword.getCreatedAt());
        updatedPassword.setUpdatedAt(Instant.now());

        when(passwordRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.of(testPassword));
        when(passwordRepository.save(any(PasswordEntry.class))).thenReturn(updatedPassword);

        // When
        PasswordResponse result = passwordService.updatePassword(1L, updateRequest, testUser);

        // Then
        assertNotNull(result);
        assertEquals(1L, result.id());
        assertEquals("updated-encrypted-site", result.encryptedSite());
        assertEquals("updated-encrypted-login", result.encryptedLogin());
        assertEquals("updated-encrypted-password", result.encryptedPassword());
        assertEquals("updated-encrypted-type", result.encryptedType());
        verify(passwordRepository).findByIdAndUser(1L, testUser);
        verify(passwordRepository).save(any(PasswordEntry.class));
    }

    @Test
    void updatePassword_NonExistingPassword_ThrowsException() {
        // Given
        PasswordRequest updateRequest = new PasswordRequest(
            "updated-encrypted-title",
            "updated-encrypted-site",
            "updated-encrypted-login",
            "updated-encrypted-password",
            "updated-encrypted-type"
        );
        when(passwordRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.empty());

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class,
            () -> passwordService.updatePassword(1L, updateRequest, testUser));
        assertEquals("Password not found", exception.getMessage());
        verify(passwordRepository).findByIdAndUser(1L, testUser);
        verify(passwordRepository, never()).save(any(PasswordEntry.class));
    }

    @Test
    void deletePassword_ExistingPassword_DeletesPassword() {
        // Given
        when(passwordRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.of(testPassword));

        // When
        assertDoesNotThrow(() -> passwordService.deletePassword(1L, testUser));

        // Then
        verify(passwordRepository).findByIdAndUser(1L, testUser);
        verify(passwordRepository).deleteByIdAndUser(1L, testUser);
    }

    @Test
    void deletePassword_NonExistingPassword_ThrowsException() {
        // Given
        when(passwordRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.empty());

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class,
            () -> passwordService.deletePassword(1L, testUser));
        assertEquals("Password not found", exception.getMessage());
        verify(passwordRepository).findByIdAndUser(1L, testUser);
        verify(passwordRepository, never()).deleteByIdAndUser(anyLong(), any(User.class));
    }
} 