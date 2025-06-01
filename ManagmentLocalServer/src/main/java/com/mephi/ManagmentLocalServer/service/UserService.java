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

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

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
} 