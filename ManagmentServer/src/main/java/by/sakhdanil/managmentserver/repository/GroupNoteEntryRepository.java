package by.sakhdanil.managmentserver.repository;

import by.sakhdanil.managmentserver.entity.GroupNoteEntry;
import by.sakhdanil.managmentserver.entity.VaultGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupNoteEntryRepository extends JpaRepository<GroupNoteEntry, Long> {

    List<GroupNoteEntry> findByGroup(VaultGroup group);
}
