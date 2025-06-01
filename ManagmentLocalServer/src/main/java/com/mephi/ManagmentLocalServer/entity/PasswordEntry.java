package com.mephi.ManagmentLocalServer.entity;

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
    @Column(nullable = false)
    private String encryptedTitle; // зашифрованное название записи пароля
    
    @NotBlank
    @Column(nullable = false)
    private String encryptedSite; // зашифрованный сайт
    
    @NotBlank
    @Column(nullable = false)
    private String encryptedLogin; // зашифрованный логин
    
    @NotBlank
    @Column(nullable = false)
    private String encryptedPassword; // зашифрованный пароль
    
    @NotBlank
    @Column(nullable = false)
    private String encryptedType; // зашифрованный тип
    
    @Column
    private String remoteId; // ID на удаленном сервере для синхронизации
    
    @Column(nullable = false)
    private Instant createdAt;
    
    @Column(nullable = false)
    private Instant updatedAt;
    
    @Column
    private Instant lastSyncAt; // Время последней синхронизации
    
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