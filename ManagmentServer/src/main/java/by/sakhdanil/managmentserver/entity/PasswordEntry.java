package by.sakhdanil.managmentserver.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "password_entries")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PasswordEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull
    private User user;
    
    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedTitle; // зашифрованное название записи пароля
    
    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedSite; // зашифрованный сайт
    
    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedLogin; // зашифрованный логин
    
    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedPassword; // зашифрованный пароль
    
    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedType; // зашифрованный тип
    
    @Column(nullable = false)
    private Instant createdAt;
    
    @Column(nullable = false)
    private Instant updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}