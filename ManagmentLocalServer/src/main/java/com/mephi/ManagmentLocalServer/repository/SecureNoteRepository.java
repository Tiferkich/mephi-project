package com.mephi.ManagmentLocalServer.repository;


import com.mephi.ManagmentLocalServer.entity.SecureNote;
import com.mephi.ManagmentLocalServer.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface SecureNoteRepository extends JpaRepository<SecureNote, Long> {
    
    List<SecureNote> findByUser(User user);
    
    List<SecureNote> findByUserOrderByUpdatedAtDesc(User user);
    
    Optional<SecureNote> findByIdAndUser(Long id, User user);
    
    Optional<SecureNote> findByRemoteIdAndUser(String remoteId, User user);
    
    @Query("SELECT n FROM SecureNote n WHERE n.user = :user AND n.lastSyncAt IS NULL")
    List<SecureNote> findUnsyncedByUser(@Param("user") User user);
    
    @Query("SELECT n FROM SecureNote n WHERE n.user = :user AND (n.lastSyncAt IS NULL OR n.updatedAt > n.lastSyncAt)")
    List<SecureNote> findModifiedSinceLastSync(@Param("user") User user);
    
    @Query("SELECT n FROM SecureNote n WHERE n.user = :user AND n.updatedAt > :since")
    List<SecureNote> findByUserAndUpdatedAtAfter(@Param("user") User user, @Param("since") Instant since);
} 