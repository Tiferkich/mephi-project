package by.sakhdanil.managmentserver.repository;

import by.sakhdanil.managmentserver.entity.SecureNote;
import by.sakhdanil.managmentserver.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SecureNoteRepository extends JpaRepository<SecureNote, Long> {
    List<SecureNote> findByUser(User user);
    Optional<SecureNote> findByIdAndUser(Long id, User user);
    void deleteByIdAndUser(Long id, User user);
} 