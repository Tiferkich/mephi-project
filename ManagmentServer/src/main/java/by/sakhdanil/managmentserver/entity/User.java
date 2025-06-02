package by.sakhdanil.managmentserver.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @NotBlank
    @Size(min = 3, max = 50)
    @Column(unique = true, nullable = false)
    private String username;             // логин
    
    @Email
    @Column(unique = true, nullable = false)
    private String email;
    
    @Column(nullable = false)
    private boolean emailVerified = false;
    
    @NotBlank
    @Column(nullable = false)
    private String salt;
    
    @NotBlank
    @Column(nullable = false)
    private String passwordHash;      // Argon2 hash(hash(masterPassword) + salt)
    
    @Column
    private String otpCode;
    
    @Column
    private Instant otpExpiresAt;
    
    @Column
    private String otpType; // "EMAIL_VERIFICATION", "ACCOUNT_RECOVERY", "SYNC_SETUP"
    
    @Column
    private String transferToken;
    
    @Column
    private Instant transferTokenExpiresAt;
    
    @Column
    private String localUserId;
    
    @Column(nullable = false)
    private Instant createdAt;
    
    @Column(nullable = false)
    private Instant updatedAt;
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SecureNote> notes;
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PasswordEntry> passwordEntries;
    
    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
    
    public boolean isOtpValid(String code, String type) {
        return otpCode != null && 
               otpCode.equals(code) && 
               otpType != null &&
               otpType.equals(type) &&
               otpExpiresAt != null && 
               otpExpiresAt.isAfter(Instant.now());
    }
    
    public void setOtp(String code, String type, int validityMinutes) {
        this.otpCode = code;
        this.otpType = type;
        this.otpExpiresAt = Instant.now().plusSeconds(validityMinutes * 60L);
    }
    
    public void clearOtp() {
        this.otpCode = null;
        this.otpType = null;
        this.otpExpiresAt = null;
    }
    
    public boolean isTransferTokenValid(String token) {
        return transferToken != null && 
               transferToken.equals(token) && 
               transferTokenExpiresAt != null && 
               transferTokenExpiresAt.isAfter(Instant.now());
    }
    
    public void setTransferToken(String token, int validityMinutes) {
        this.transferToken = token;
        this.transferTokenExpiresAt = Instant.now().plusSeconds(validityMinutes * 60L);
    }
    
    public void clearTransferToken() {
        this.transferToken = null;
        this.transferTokenExpiresAt = null;
    }
    
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of();
    }
    
    @Override
    public String getPassword() {
        return passwordHash;
    }
    
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }
    
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }
    
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
    
    @Override
    public boolean isEnabled() {
        return emailVerified;
    }
}