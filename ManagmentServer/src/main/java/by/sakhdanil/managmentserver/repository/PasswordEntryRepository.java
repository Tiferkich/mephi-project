package by.sakhdanil.managmentserver.repository;

import by.sakhdanil.managmentserver.entity.PasswordEntry;
import by.sakhdanil.managmentserver.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordEntryRepository extends JpaRepository<PasswordEntry, Long> {
    List<PasswordEntry> findByUser(User user);
    Optional<PasswordEntry> findByIdAndUser(Long id, User user);
    void deleteByIdAndUser(Long id, User user);
} 