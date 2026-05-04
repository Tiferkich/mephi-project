package by.sakhdanil.managmentserver.repository;

import by.sakhdanil.managmentserver.entity.GroupPasswordEntry;
import by.sakhdanil.managmentserver.entity.VaultGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupPasswordEntryRepository extends JpaRepository<GroupPasswordEntry, Long> {

    List<GroupPasswordEntry> findByGroup(VaultGroup group);
}
