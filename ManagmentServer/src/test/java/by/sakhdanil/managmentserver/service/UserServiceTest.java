package by.sakhdanil.managmentserver.service;

import by.sakhdanil.managmentserver.dto.user.JwtResponse;
import by.sakhdanil.managmentserver.dto.user.LoginRequest;
import by.sakhdanil.managmentserver.dto.user.RegisterRequest;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User testUser;
    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId("test-id");
        testUser.setUsername("testuser");
        testUser.setSalt("test-salt");
        testUser.setPasswordHash("test-hash");

        registerRequest = new RegisterRequest("testuser", "test-salt", "test-hash");
        loginRequest = new LoginRequest("testuser", "test-hash");
    }

    @Test
    void loadUserByUsername_UserExists_ReturnsUser() {
        // Given
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        // When
        User result = (User) userService.loadUserByUsername("testuser");

        // Then
        assertNotNull(result);
        assertEquals("testuser", result.getUsername());
        verify(userRepository).findByUsername("testuser");
    }

    @Test
    void loadUserByUsername_UserNotExists_ThrowsException() {
        // Given
        when(userRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());

        // When & Then
        assertThrows(UsernameNotFoundException.class, 
            () -> userService.loadUserByUsername("nonexistent"));
        verify(userRepository).findByUsername("nonexistent");
    }

    @Test
    void register_NewUser_ReturnsJwtResponse() {
        // Given
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtService.generateToken(any(User.class))).thenReturn("test-token");

        // When
        JwtResponse result = userService.register(registerRequest);

        // Then
        assertNotNull(result);
        assertEquals("test-token", result.token());
        assertEquals("test-id", result.userId());
        assertEquals("testuser", result.username());
        assertEquals("Bearer", result.type());
        
        verify(userRepository).existsByUsername("testuser");
        verify(userRepository).save(any(User.class));
        verify(jwtService).generateToken(any(User.class));
    }

    @Test
    void register_ExistingUser_ThrowsException() {
        // Given
        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class, 
            () -> userService.register(registerRequest));
        assertEquals("Username already exists", exception.getMessage());
        
        verify(userRepository).existsByUsername("testuser");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void login_ValidCredentials_ReturnsJwtResponse() {
        // Given
        testUser.setPasswordHash("test-hash"); // Устанавливаем тот же хеш что в запросе
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(jwtService.generateToken(testUser)).thenReturn("test-token");

        // When
        JwtResponse result = userService.login(loginRequest);

        // Then
        assertNotNull(result);
        assertEquals("test-token", result.token());
        assertEquals("test-id", result.userId());
        assertEquals("testuser", result.username());
        
        verify(userRepository).findByUsername("testuser");
        verify(jwtService).generateToken(testUser);
    }

    @Test
    void login_UserNotFound_ThrowsException() {
        // Given
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.empty());

        // When & Then
        assertThrows(UsernameNotFoundException.class, 
            () -> userService.login(loginRequest));
        
        verify(userRepository).findByUsername("testuser");
        verify(jwtService, never()).generateToken(any(User.class));
    }

    @Test
    void login_InvalidPassword_ThrowsException() {
        // Given
        testUser.setPasswordHash("different-hash"); // Устанавливаем другой хеш
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        // When & Then
        assertThrows(RuntimeException.class, 
            () -> userService.login(loginRequest));
        
        verify(userRepository).findByUsername("testuser");
        verify(jwtService, never()).generateToken(any(User.class));
    }
} 