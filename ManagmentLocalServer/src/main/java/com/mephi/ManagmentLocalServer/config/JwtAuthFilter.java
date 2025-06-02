package com.mephi.ManagmentLocalServer.config;

import com.mephi.ManagmentLocalServer.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    
    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    
    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        
        System.out.println("🔐 LOCAL JWT Filter: " + request.getMethod() + " " + request.getRequestURI());
        
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;
        
        System.out.println("🔐 LOCAL Auth Header: " + (authHeader != null ? "Bearer ****" : "null"));
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            System.out.println("🔐 LOCAL No JWT token found, continuing filter chain");
            filterChain.doFilter(request, response);
            return;
        }
        
        jwt = authHeader.substring(7);
        username = jwtService.extractUsername(jwt);
        System.out.println("🔐 LOCAL JWT Username: " + username);
        
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);
                System.out.println("🔐 LOCAL User found: " + userDetails.getUsername());
                
                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    System.out.println("🔐 LOCAL Authentication successful for: " + username);
                } else {
                    System.out.println("🔐 LOCAL JWT token is invalid for user: " + username);
                }
            } catch (Exception e) {
                System.out.println("🔐 LOCAL Error during authentication: " + e.getMessage());
            }
        } else if (SecurityContextHolder.getContext().getAuthentication() != null) {
            System.out.println("🔐 LOCAL User already authenticated: " + SecurityContextHolder.getContext().getAuthentication().getName());
        }
        
        System.out.println("🔐 LOCAL JWT Filter completed, continuing chain");
        filterChain.doFilter(request, response);
    }
} 