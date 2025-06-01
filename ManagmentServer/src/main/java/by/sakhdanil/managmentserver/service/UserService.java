package by.sakhdanil.managmentserver.service;

import by.sakhdanil.managmentserver.dto.user.JwtResponse;
import by.sakhdanil.managmentserver.dto.user.LoginRequest;
import by.sakhdanil.managmentserver.dto.user.RegisterRequest;
import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {
    
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }
    
    public JwtResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new RuntimeException("Username already exists");
        }
        
        User user = new User();
        user.setUsername(request.username());
        user.setSalt(request.salt());
        user.setPasswordHash(request.passwordHash());
        
        User savedUser = userRepository.save(user);
        String token = jwtService.generateToken(savedUser);
        
        return new JwtResponse(token, savedUser.getId(), savedUser.getUsername());
    }
    
    public JwtResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.username(),
                        request.passwordHash()
                )
        );

        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        
        String token = jwtService.generateToken(user);
        return new JwtResponse(token, user.getId(), user.getUsername());
    }
} 
        
        String token = jwtService.generateToken(user);
        return new JwtResponse(token, user.getId(), user.getUsername());
    }
} 