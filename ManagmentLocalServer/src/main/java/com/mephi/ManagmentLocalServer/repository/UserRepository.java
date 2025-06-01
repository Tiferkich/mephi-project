package com.mephi.ManagmentLocalServer.repository;

import com.mephi.ManagmentLocalServer.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    
    Optional<User> findByUsername(String username);
    
    boolean existsByUsername(String username);
    
    @Query("SELECT COUNT(u) FROM User u WHERE u.isSetup = true")
    long countSetupUsers();
    
    @Query("SELECT u FROM User u WHERE u.isSetup = true")
    Optional<User> findSetupUser();
} 