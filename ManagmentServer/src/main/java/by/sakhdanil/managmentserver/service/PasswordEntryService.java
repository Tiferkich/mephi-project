package by.sakhdanil.managmentserver.service;

import by.sakhdanil.managmentserver.dto.password.PasswordRequest;
import by.sakhdanil.managmentserver.dto.password.PasswordResponse;
import by.sakhdanil.managmentserver.entity.PasswordEntry;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.repository.PasswordEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PasswordEntryService {
    
    private final PasswordEntryRepository passwordRepository;
    
    public List<PasswordResponse> getAllPasswords(User user) {
        return passwordRepository.findByUser(user)
            .stream()
            .map(this::toResponse)
            .toList();
    }
    
    public PasswordResponse createPassword(PasswordRequest request, User user) {
        PasswordEntry password = new PasswordEntry();
        password.setUser(user);
        password.setEncryptedTitle(request.encryptedTitle());
        password.setEncryptedSite(request.encryptedSite());
        password.setEncryptedLogin(request.encryptedLogin());
        password.setEncryptedPassword(request.encryptedPassword());
        password.setEncryptedType(request.encryptedType());
        
        PasswordEntry savedPassword = passwordRepository.save(password);
        return toResponse(savedPassword);
    }
    
    public PasswordResponse updatePassword(Long id, PasswordRequest request, User user) {
        PasswordEntry password = passwordRepository.findByIdAndUser(id, user)
            .orElseThrow(() -> new RuntimeException("Password not found"));
        
        password.setEncryptedTitle(request.encryptedTitle());
        password.setEncryptedSite(request.encryptedSite());
        password.setEncryptedLogin(request.encryptedLogin());
        password.setEncryptedPassword(request.encryptedPassword());
        password.setEncryptedType(request.encryptedType());
        PasswordEntry savedPassword = passwordRepository.save(password);
        return toResponse(savedPassword);
    }
    
    public void deletePassword(Long id, User user) {
        if (!passwordRepository.findByIdAndUser(id, user).isPresent()) {
            throw new RuntimeException("Password not found");
        }
        passwordRepository.deleteByIdAndUser(id, user);
    }
    
    private PasswordResponse toResponse(PasswordEntry password) {
        return new PasswordResponse(
            password.getId(),
            password.getEncryptedTitle(),
            password.getEncryptedSite(),
            password.getEncryptedLogin(),
            password.getEncryptedPassword(),
            password.getEncryptedType(),
            password.getCreatedAt(),
            password.getUpdatedAt()
        );
    }
} 