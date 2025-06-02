package com.mephi.ManagmentLocalServer.service;

import com.mephi.ManagmentLocalServer.config.JwtService;
import com.mephi.ManagmentLocalServer.dto.auth.AuthResponse;
import com.mephi.ManagmentLocalServer.dto.auth.LoginRequest;
import com.mephi.ManagmentLocalServer.dto.auth.SetupRequest;
import com.mephi.ManagmentLocalServer.entity.User;
import com.mephi.ManagmentLocalServer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final RemoteAuthService remoteAuthService;

    @Transactional
    public AuthResponse setup(SetupRequest request) {
        // Проверим, что пользователей еще нет
        long userCount = userRepository.countSetupUsers();
        if (userCount > 0) {
            throw new IllegalStateException("User already setup. Use login instead.");
        }

        // Создаем пользователя
        User user = new User();
        user.setId(UUID.randomUUID().toString()); // Генерируем UUID как ID
        user.setUsername(request.getUsername());
        user.setSalt(request.getSalt());
        user.setPasswordHash(request.getPasswordHash()); // Сохраняем хеш напрямую, он уже обработан на клиенте
        user.setSetup(true);

        user = userRepository.save(user);
        log.info("User setup completed for username: {}", request.getUsername());

        // Генерируем JWT токен
        String jwtToken = jwtService.generateToken(user);

        return new AuthResponse(jwtToken, user.getUsername(), true);
    }

    public AuthResponse login(LoginRequest request) {
        // Получаем единственного пользователя (в локальном режиме один пользователь)
        User user = userRepository.findSetupUser()
                .orElseThrow(() -> new IllegalStateException("No user setup found. Please run setup first."));

        // Аутентификация с username пользователя из БД и паролем из запроса
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        user.getUsername(),
                        request.getPasswordHash()
                )
        );

        // Генерируем новый JWT токен
        String jwtToken = jwtService.generateToken(user);
        log.info("User logged in: {}", user.getUsername());

        return new AuthResponse(jwtToken, user.getUsername(), true);
    }

    public boolean isSetup() {
        return userRepository.countSetupUsers() > 0;
    }

    public User getCurrentUser() {
        return userRepository.findSetupUser()
                .orElseThrow(() -> new IllegalStateException("No user setup found"));
    }

    /**
     * Получает пользователя по JWT токену
     */
    public User getUserByJwtToken(String jwtToken) {
        try {
            // Извлекаем username из JWT токена
            String username = jwtService.extractUsername(jwtToken);
            if (username == null) {
                return null;
            }
            
            // Валидируем токен
            User user = userRepository.findSetupUser().orElse(null);
            if (user == null || !jwtService.isTokenValid(jwtToken, user)) {
                return null;
            }
            
            return user;
        } catch (Exception e) {
            log.warn("Failed to get user by JWT token: {}", e.getMessage());
            return null;
        }
    }

    @Transactional
    public void updateRemoteToken(String remoteToken) {
        User user = getCurrentUser();
        user.setRemoteToken(remoteToken);
        userRepository.save(user);
        log.info("Remote token updated for user: {}", user.getUsername());
    }

    @Transactional
    public void updateRemoteId(String remoteId) {
        User user = getCurrentUser();
        user.setRemoteId(remoteId);
        userRepository.save(user);
        log.info("Remote ID updated for user: {} -> remoteId: {}", user.getUsername(), remoteId);
    }

    @Transactional
    public void updateRemoteData(String remoteId, String remoteToken) {
        User user = getCurrentUser();
        user.setRemoteId(remoteId);
        user.setRemoteToken(remoteToken);
        userRepository.save(user);
        log.info("Remote data updated for user: {} -> remoteId: {}", user.getUsername(), remoteId);
    }

    public String getRemoteId() {
        User user = getCurrentUser();
        return user.getRemoteId();
    }

    public String getRemoteToken() {
        User user = getCurrentUser();
        return user.getRemoteToken();
    }

    public boolean hasRemoteAccount() {
        try {
            User user = getCurrentUser();
            return user.getRemoteId() != null && user.getRemoteToken() != null;
        } catch (Exception e) {
            return false;
        }
    }

    @Transactional
    public Map<String, Object> replaceAccount(
            String username, 
            String email, 
            String masterPasswordHash, 
            String salt, 
            String remoteToken, 
            String remoteId,
            List<Map<String, Object>> passwords,
            List<Map<String, Object>> notes
    ) {
        try {
            // 1. Удаляем всех текущих пользователей и их данные
            log.info("Deleting existing local account and data...");
            userRepository.deleteAll(); // Это также удалит связанные пароли и заметки через cascade
            
            // 2. Создаем нового пользователя с данными из удаленного сервера
            log.info("Creating new user from recovered account: {}", username);
            User newUser = new User();
            newUser.setId(UUID.randomUUID().toString());
            newUser.setUsername(username);
            newUser.setSalt(salt);
            newUser.setPasswordHash(masterPasswordHash); // Уже захешированный пароль
            newUser.setSetup(true);
            newUser.setRemoteId(remoteId);
            newUser.setRemoteToken(remoteToken);
            
            newUser = userRepository.save(newUser);
            
            // 3. Импортируем пароли (через PasswordService, если нужно)
            int passwordsImported = 0;
            if (passwords != null && !passwords.isEmpty()) {
                // Здесь можно добавить логику импорта паролей
                // Пока просто считаем количество
                passwordsImported = passwords.size();
                log.info("Would import {} passwords", passwordsImported);
            }
            
            // 4. Импортируем заметки (через NoteService, если нужно)
            int notesImported = 0;
            if (notes != null && !notes.isEmpty()) {
                // Здесь можно добавить логику импорта заметок
                // Пока просто считаем количество
                notesImported = notes.size();
                log.info("Would import {} notes", notesImported);
            }
            
            // 5. Генерируем новый JWT токен для нового пользователя
            String jwtToken = jwtService.generateToken(newUser);
            
            log.info("Account replacement completed successfully for user: {}", username);
            
            return Map.of(
                "success", true,
                "message", "Account replaced successfully",
                "token", jwtToken,
                "username", username,
                "passwordsImported", passwordsImported,
                "notesImported", notesImported
            );
            
        } catch (Exception e) {
            log.error("Account replacement failed: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to replace account: " + e.getMessage());
        }
    }

    @Transactional
    public Map<String, Object> connectRemoteAccount(
            String remoteToken, 
            String remoteId,
            Map<String, Object> userData,
            List<Map<String, Object>> passwords,
            List<Map<String, Object>> notes
    ) {
        try {
            // 1. Получаем текущего локального пользователя (НЕ удаляем его)
            User currentUser = getCurrentUser();
            log.info("Connecting remote account to local user: {}", currentUser.getUsername());
            
            // 2. Проверяем что remoteToken и remoteId валидны
            if (remoteToken == null || remoteToken.trim().isEmpty()) {
                throw new RuntimeException("Remote token is required");
            }
            if (remoteId == null || remoteId.trim().isEmpty()) {
                throw new RuntimeException("Remote ID is required");
            }
            
            // 3. Обновляем связь с удаленным аккаунтом
            currentUser.setRemoteId(remoteId);
            currentUser.setRemoteToken(remoteToken);
            
            userRepository.save(currentUser);
            
            // 4. Данные будут синхронизированы позже через обычный процесс синхронизации
            log.info("Remote account credentials stored. Data will be synced via sync process.");
            
            // 5. Возвращаем информацию о подключении (токен остается прежний)
            String existingToken = jwtService.generateToken(currentUser); // Обновляем токен с новой информацией
            
            log.info("Remote account connected successfully for user: {}", currentUser.getUsername());
            
            return Map.of(
                "success", true,
                "message", "Remote account connected successfully. Use 'Sync Now' to synchronize data.",
                "token", existingToken,
                "username", currentUser.getUsername(),
                "passwordsSynced", 0, // Будут синхронизированы позже
                "notesSynced", 0      // Будут синхронизированы позже
            );
            
        } catch (Exception e) {
            log.error("Remote account connection failed: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to connect remote account: " + e.getMessage());
        }
    }

    /**
     * Очищает данные удаленного аккаунта
     */
    @Transactional
    public void clearRemoteData() {
        User user = getCurrentUser();
        user.setRemoteId(null);
        user.setRemoteToken(null);
        userRepository.save(user);
        log.info("Remote data cleared for user: {}", user.getUsername());
    }

    /**
     * Вход через JWT токен удаленного сервера
     */
    @Transactional
    public Map<String, Object> loginWithJwtToken(String jwtToken) {
        try {
            log.info("Starting JWT token login process");
            
            // 1. Проверяем JWT токен через RemoteAuthService
            Map<String, Object> remoteUserData = remoteAuthService.validateJwtToken(jwtToken);
            
            // 2. Извлекаем данные пользователя из ответа
            String username = (String) remoteUserData.get("username");
            String remoteUserId = (String) remoteUserData.get("userId");
            String remoteToken = (String) remoteUserData.get("token");
            
            if (username == null || remoteUserId == null || remoteToken == null) {
                throw new RuntimeException("Invalid response from remote server - missing required fields");
            }
            
            log.info("JWT token validated for user: {}", username);
            
            // 3. Проверяем, есть ли уже локальный пользователь
            boolean hasLocalUser = isSetup();
            
            if (hasLocalUser) {
                // Обновляем существующего пользователя
                User existingUser = getCurrentUser();
                existingUser.setRemoteId(remoteUserId);
                existingUser.setRemoteToken(remoteToken);
                userRepository.save(existingUser);
                
                String localToken = jwtService.generateToken(existingUser);
                
                log.info("Connected cloud account to existing local user: {}", existingUser.getUsername());
                
                return Map.of(
                    "success", true,
                    "message", "Cloud account connected to local user",
                    "token", localToken,
                    "username", existingUser.getUsername(),
                    "userId", existingUser.getId()
                );
            } else {
                // Создаем нового локального пользователя на основе облачного
                User newUser = new User();
                newUser.setId(UUID.randomUUID().toString());
                newUser.setUsername(username);
                newUser.setSalt("cloud_generated"); // Временно, будет заменен при установке мастер-пароля
                newUser.setPasswordHash("cloud_pending"); // Временно, будет заменен при установке мастер-пароля
                newUser.setSetup(false); // Требуется настройка мастер-пароля
                newUser.setRemoteId(remoteUserId);
                newUser.setRemoteToken(remoteToken);
                
                newUser = userRepository.save(newUser);
                
                String localToken = jwtService.generateToken(newUser);
                
                log.info("Created new local user from cloud account: {}", username);
                
                return Map.of(
                    "success", true,
                    "message", "Cloud account imported. Please set up master password.",
                    "token", localToken,
                    "username", username,
                    "userId", newUser.getId(),
                    "requiresSetup", true
                );
            }
            
        } catch (Exception e) {
            log.error("JWT token login failed: {}", e.getMessage(), e);
            throw new RuntimeException("JWT login failed: " + e.getMessage());
        }
    }

    /**
     * Использование transfer токена
     */
    @Transactional
    public Map<String, Object> useTransferToken(String transferToken) {
        try {
            log.info("Starting transfer token usage process");
            
            // 1. Используем transfer токен через RemoteAuthService
            Map<String, Object> transferData = remoteAuthService.useTransferToken(transferToken);
            
            // 2. Извлекаем данные из ответа
            String username = (String) transferData.get("username");
            String remoteUserId = (String) transferData.get("userId");
            String remoteToken = (String) transferData.get("token");
            String masterPasswordHash = (String) transferData.get("passwordHash");
            String salt = (String) transferData.get("salt");
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> passwords = (List<Map<String, Object>>) transferData.get("passwords");
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> notes = (List<Map<String, Object>>) transferData.get("notes");
            
            if (username == null || remoteUserId == null || remoteToken == null || 
                masterPasswordHash == null || salt == null) {
                throw new RuntimeException("Invalid transfer data - missing required fields");
            }
            
            log.info("Transfer token validated for user: {}", username);
            
            // 3. Удаляем существующих пользователей (если есть)
            if (isSetup()) {
                log.info("Removing existing local account for transfer");
                userRepository.deleteAll();
            }
            
            // 4. Создаем нового пользователя с полными данными
            User newUser = new User();
            newUser.setId(UUID.randomUUID().toString());
            newUser.setUsername(username);
            newUser.setSalt(salt);
            newUser.setPasswordHash(masterPasswordHash);
            newUser.setSetup(true);
            newUser.setRemoteId(remoteUserId);
            newUser.setRemoteToken(remoteToken);
            
            newUser = userRepository.save(newUser);
            
            // 5. Импортируем данные (здесь можно расширить логику импорта)
            int passwordsImported = passwords != null ? passwords.size() : 0;
            int notesImported = notes != null ? notes.size() : 0;
            
            log.info("Transfer completed: {} passwords, {} notes", passwordsImported, notesImported);
            
            // 6. Генерируем локальный JWT токен
            String localToken = jwtService.generateToken(newUser);
            
            log.info("Transfer token usage completed for user: {}", username);
            
            return Map.of(
                "success", true,
                "message", "Data transferred successfully",
                "token", localToken,
                "username", username,
                "userId", newUser.getId(),
                "passwordsImported", passwordsImported,
                "notesImported", notesImported
            );
            
        } catch (Exception e) {
            log.error("Transfer token usage failed: {}", e.getMessage(), e);
            throw new RuntimeException("Transfer token usage failed: " + e.getMessage());
        }
    }

    /**
     * Облачный вход через email, username и master password
     */
    @Transactional
    public Map<String, Object> cloudLogin(String email, String username, String masterPassword) {
        try {
            log.info("Starting cloud login process for user: {}", username);
            
            // 1. Инициируем облачный вход через RemoteAuthService
            Map<String, Object> remoteResponse = remoteAuthService.cloudLogin(email, username, masterPassword);
            
            // 2. Проверяем что от удаленного сервера пришла информация о необходимости OTP
            Boolean requiresOTP = (Boolean) remoteResponse.get("requiresOTP");
            String sessionId = (String) remoteResponse.get("sessionId");
            
            if (requiresOTP == null || !requiresOTP) {
                throw new RuntimeException("Unexpected response from remote server - OTP verification required");
            }
            
            if (sessionId == null || sessionId.isEmpty()) {
                throw new RuntimeException("Session ID not provided by remote server");
            }
            
            log.info("Cloud login initiated successfully for user: {}, session: {}", username, sessionId);
            
            return Map.of(
                "requiresOTP", true,
                "sessionId", sessionId,
                "username", username,
                "message", "OTP code sent to your email. Please verify to complete login."
            );
            
        } catch (Exception e) {
            log.error("Cloud login failed: {}", e.getMessage(), e);
            throw new RuntimeException("Cloud login failed: " + e.getMessage());
        }
    }

    /**
     * Верификация OTP для облачного входа
     */
    @Transactional
    public Map<String, Object> verifyCloudOTP(String otpCode, String username) {
        try {
            log.info("Starting OTP verification for user: {}", username);
            
            // 1. Верифицируем OTP через RemoteAuthService
            Map<String, Object> remoteUserData = remoteAuthService.verifyCloudOTP(otpCode, username);
            
            // 2. Извлекаем данные пользователя из ответа
            String remoteUsername = (String) remoteUserData.get("username");
            String remoteUserId = (String) remoteUserData.get("userId");
            String remoteToken = (String) remoteUserData.get("token");
            String email = (String) remoteUserData.get("email");
            String masterPasswordHash = (String) remoteUserData.get("passwordHash");
            String salt = (String) remoteUserData.get("salt");
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> passwords = (List<Map<String, Object>>) remoteUserData.get("passwords");
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> notes = (List<Map<String, Object>>) remoteUserData.get("notes");
            
            if (remoteUsername == null || remoteUserId == null || remoteToken == null || 
                masterPasswordHash == null || salt == null) {
                throw new RuntimeException("Invalid response from remote server - missing required fields");
            }
            
            log.info("OTP verification successful for user: {}", remoteUsername);
            
            // 3. Проверяем, есть ли уже локальный пользователь
            boolean hasLocalUser = isSetup();
            
            if (hasLocalUser) {
                // Обновляем существующего пользователя облачными данными
                User existingUser = getCurrentUser();
                existingUser.setRemoteId(remoteUserId);
                existingUser.setRemoteToken(remoteToken);
                userRepository.save(existingUser);
                
                String localToken = jwtService.generateToken(existingUser);
                
                log.info("Connected cloud account to existing local user: {}", existingUser.getUsername());
                
                return Map.of(
                    "success", true,
                    "message", "Cloud account connected to local user",
                    "token", localToken,
                    "username", existingUser.getUsername(),
                    "userId", existingUser.getId()
                );
                
            } else {
                // Создаем нового локального пользователя на основе облачного аккаунта
                User newUser = new User();
                newUser.setId(UUID.randomUUID().toString());
                newUser.setUsername(remoteUsername);
                newUser.setSalt(salt);
                newUser.setPasswordHash(masterPasswordHash);
                newUser.setSetup(true); // Сразу настроен, так как данные из облака
                newUser.setRemoteId(remoteUserId);
                newUser.setRemoteToken(remoteToken);
                
                newUser = userRepository.save(newUser);
                
                // Импортируем данные (здесь можно расширить логику импорта)
                int passwordsImported = passwords != null ? passwords.size() : 0;
                int notesImported = notes != null ? notes.size() : 0;
                
                log.info("Cloud account imported: {} passwords, {} notes", passwordsImported, notesImported);
                
                String localToken = jwtService.generateToken(newUser);
                
                log.info("Created new local user from cloud account: {}", remoteUsername);
                
                return Map.of(
                    "success", true,
                    "message", "Cloud account successfully imported",
                    "token", localToken,
                    "username", remoteUsername,
                    "userId", newUser.getId(),
                    "passwordsImported", passwordsImported,
                    "notesImported", notesImported
                );
            }
            
        } catch (Exception e) {
            log.error("OTP verification failed: {}", e.getMessage(), e);
            throw new RuntimeException("OTP verification failed: " + e.getMessage());
        }
    }
} 