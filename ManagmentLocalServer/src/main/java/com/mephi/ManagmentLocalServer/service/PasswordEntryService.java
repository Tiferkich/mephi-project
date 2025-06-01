package com.mephi.ManagmentLocalServer.service;

import com.mephi.ManagmentLocalServer.dto.password.PasswordRequest;
import com.mephi.ManagmentLocalServer.dto.password.PasswordResponse;
import com.mephi.ManagmentLocalServer.entity.PasswordEntry;
import com.mephi.ManagmentLocalServer.entity.User;
import com.mephi.ManagmentLocalServer.repository.PasswordEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordEntryService {

    private final PasswordEntryRepository passwordRepository;
    private final UserService userService;

    public List<PasswordResponse> getAllPasswords() {
        User currentUser = userService.getCurrentUser();
        List<PasswordEntry> passwords = passwordRepository.findByUserOrderByUpdatedAtDesc(currentUser);
        
        return passwords.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PasswordResponse createPassword(PasswordRequest request) {
        User currentUser = userService.getCurrentUser();
        
        PasswordEntry password = new PasswordEntry();
        password.setUser(currentUser);
        password.setEncryptedTitle(request.getEncryptedTitle());
        password.setEncryptedSite(request.getEncryptedSite());
        password.setEncryptedLogin(request.getEncryptedLogin());
        password.setEncryptedPassword(request.getEncryptedPassword());
        password.setEncryptedType(request.getEncryptedType());
        
        password = passwordRepository.save(password);
        log.info("Created new password entry with id: {} for user: {}", password.getId(), currentUser.getUsername());
        
        return convertToResponse(password);
    }

    @Transactional
    public PasswordResponse updatePassword(Long id, PasswordRequest request) {
        User currentUser = userService.getCurrentUser();
        
        PasswordEntry password = passwordRepository.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new IllegalArgumentException("Password entry not found with id: " + id));
        
        password.setEncryptedTitle(request.getEncryptedTitle());
        password.setEncryptedSite(request.getEncryptedSite());
        password.setEncryptedLogin(request.getEncryptedLogin());
        password.setEncryptedPassword(request.getEncryptedPassword());
        password.setEncryptedType(request.getEncryptedType());
        // Сбрасываем время последней синхронизации, так как данные изменились
        password.setLastSyncAt(null);
        
        password = passwordRepository.save(password);
        log.info("Updated password entry with id: {} for user: {}", password.getId(), currentUser.getUsername());
        
        return convertToResponse(password);
    }

    @Transactional
    public void deletePassword(Long id) {
        User currentUser = userService.getCurrentUser();
        
        PasswordEntry password = passwordRepository.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new IllegalArgumentException("Password entry not found with id: " + id));
        
        passwordRepository.delete(password);
        log.info("Deleted password entry with id: {} for user: {}", id, currentUser.getUsername());
    }

    public PasswordResponse getPasswordById(Long id) {
        User currentUser = userService.getCurrentUser();
        
        PasswordEntry password = passwordRepository.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new IllegalArgumentException("Password entry not found with id: " + id));
        
        return convertToResponse(password);
    }

    // Методы для синхронизации
    public List<PasswordEntry> getUnsyncedPasswords() {
        User currentUser = userService.getCurrentUser();
        return passwordRepository.findModifiedSinceLastSync(currentUser);
    }

    @Transactional
    public void markAsSynced(Long passwordId, String remoteId) {
        PasswordEntry password = passwordRepository.findById(passwordId)
                .orElseThrow(() -> new IllegalArgumentException("Password not found: " + passwordId));
        
        password.setRemoteId(remoteId);
        password.setLastSyncAt(Instant.now());
        passwordRepository.save(password);
        
        log.info("Password {} marked as synced with remoteId: {}", passwordId, remoteId);
    }

    public int countUnsyncedPasswords() {
        User currentUser = userService.getCurrentUser();
        return passwordRepository.findUnsyncedByUser(currentUser).size();
    }

    public PasswordEntry createPasswordFromRemote(String encryptedTitle, String encryptedSite, 
                                                String encryptedLogin, String encryptedPassword, 
                                                String encryptedType, String remoteId, 
                                                Instant createdAt, Instant updatedAt) {
        User currentUser = userService.getCurrentUser();
        
        PasswordEntry password = new PasswordEntry();
        password.setUser(currentUser);
        password.setEncryptedTitle(encryptedTitle);
        password.setEncryptedSite(encryptedSite);
        password.setEncryptedLogin(encryptedLogin);
        password.setEncryptedPassword(encryptedPassword);
        password.setEncryptedType(encryptedType);
        password.setRemoteId(remoteId);
        password.setLastSyncAt(Instant.now());
        
        // Устанавливаем времена создания/обновления с удаленного сервера
        password.setCreatedAt(createdAt);
        password.setUpdatedAt(updatedAt);
        
        return passwordRepository.save(password);
    }

    public List<PasswordEntry> getAllPasswordsForUser() {
        User currentUser = userService.getCurrentUser();
        return passwordRepository.findByUser(currentUser);
    }

    public PasswordEntry savePassword(PasswordEntry password) {
        return passwordRepository.save(password);
    }

    private PasswordResponse convertToResponse(PasswordEntry password) {
        return new PasswordResponse(
                password.getId(),
                password.getEncryptedTitle(),
                password.getEncryptedSite(),
                password.getEncryptedLogin(),
                password.getEncryptedPassword(),
                password.getEncryptedType(),
                password.getRemoteId(),
                password.getCreatedAt(),
                password.getUpdatedAt(),
                password.getLastSyncAt()
        );
    }
} 