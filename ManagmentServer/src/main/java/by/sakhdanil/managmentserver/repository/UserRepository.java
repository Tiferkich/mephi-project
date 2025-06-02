package by.sakhdanil.managmentserver.repository;

import by.sakhdanil.managmentserver.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    
    // ✅ НОВЫЕ МЕТОДЫ ДЛЯ EMAIL И ТОКЕНОВ
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    
    Optional<User> findByUsernameAndEmail(String username, String email);
    
    Optional<User> findByTransferToken(String transferToken);
    
    Optional<User> findByLocalUserId(String localUserId);
} 