package by.sakhdanil.managmentserver.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "secure_notes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SecureNote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull
    private User user;
    
    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedTitle; // зашифрованное название заметки
    
    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedType; // зашифрованный тип заметки
    
    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedData; // зашифрованные данные заметки
    
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