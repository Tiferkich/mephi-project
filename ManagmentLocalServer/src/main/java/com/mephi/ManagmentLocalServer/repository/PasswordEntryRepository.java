package com.mephi.ManagmentLocalServer.repository;

import com.mephi.ManagmentLocalServer.entity.PasswordEntry;
import com.mephi.ManagmentLocalServer.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordEntryRepository extends JpaRepository<PasswordEntry, Long> {
    
    List<PasswordEntry> findByUser(User user);
    
    List<PasswordEntry> findByUserOrderByUpdatedAtDesc(User user);
    
    Optional<PasswordEntry> findByIdAndUser(Long id, User user);
    
    Optional<PasswordEntry> findByRemoteIdAndUser(String remoteId, User user);
    
    @Query("SELECT p FROM PasswordEntry p WHERE p.user = :user AND p.lastSyncAt IS NULL")
    List<PasswordEntry> findUnsyncedByUser(@Param("user") User user);
    
    @Query("SELECT p FROM PasswordEntry p WHERE p.user = :user AND (p.lastSyncAt IS NULL OR p.updatedAt > p.lastSyncAt)")
    List<PasswordEntry> findModifiedSinceLastSync(@Param("user") User user);
    
    @Query("SELECT p FROM PasswordEntry p WHERE p.user = :user AND p.updatedAt > :since")
    List<PasswordEntry> findByUserAndUpdatedAtAfter(@Param("user") User user, @Param("since") Instant since);
} 