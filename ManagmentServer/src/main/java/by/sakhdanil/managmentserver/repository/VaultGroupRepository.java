package by.sakhdanil.managmentserver.repository;

import by.sakhdanil.managmentserver.entity.VaultGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VaultGroupRepository extends JpaRepository<VaultGroup, String> {

    /** All groups the given user is a member of (any status). */
    @Query("SELECT gm.group FROM GroupMember gm WHERE gm.user.id = :userId")
    List<VaultGroup> findAllByMemberUserId(@Param("userId") String userId);
}
