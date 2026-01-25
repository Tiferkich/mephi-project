package by.sakhdanil.managmentserver.config;

import by.sakhdanil.managmentserver.entity.User;
import by.sakhdanil.managmentserver.repository.UserRepository;
import by.sakhdanil.managmentserver.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        System.out.println("🔥 REMOTE JWT Filter: " + request.getMethod() + " " + request.getRequestURI());
        
        final String authHeader = request.getHeader("Authorization");
        System.out.println("🔥 REMOTE Auth Header: " + (authHeader != null ? "Bearer ****" : "null"));

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            System.out.println("🔥 REMOTE No JWT token found, continuing filter chain");
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);
        System.out.println("🔥 REMOTE JWT Token (first 50 chars): " + jwt.substring(0, Math.min(50, jwt.length())) + "...");
        
        String username;
        try {
            username = jwtService.extractUsername(jwt);
            System.out.println("🔥 REMOTE JWT Username extracted: " + username);
        } catch (Exception e) {
            System.out.println("🔥 REMOTE JWT Token parsing failed: " + e.getMessage());
            filterChain.doFilter(request, response);
            return;
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            Optional<User> userOptional = userRepository.findByUsername(username);
            
            if (userOptional.isPresent()) {
                User user = userOptional.get();
                System.out.println("🔥 REMOTE User found: " + user.getUsername());
                
                if (jwtService.isTokenValid(jwt, user)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            user,
                            null,
                            user.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    System.out.println("🔥 REMOTE Authentication successful for: " + username);
                } else {
                    System.out.println("🔥 REMOTE JWT token is invalid for user: " + username);
                }
            } else {
                System.out.println("🔥 REMOTE User not found: " + username);
            }
        } else if (SecurityContextHolder.getContext().getAuthentication() != null) {
            System.out.println("🔥 REMOTE User already authenticated: " + SecurityContextHolder.getContext().getAuthentication().getName());
        }

        System.out.println("🔥 REMOTE JWT Filter completed, continuing chain");
        filterChain.doFilter(request, response);
    }
}