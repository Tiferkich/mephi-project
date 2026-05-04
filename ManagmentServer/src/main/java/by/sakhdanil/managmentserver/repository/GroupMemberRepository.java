package by.sakhdanil.managmentserver.repository;

import by.sakhdanil.managmentserver.entity.GroupMember;
import by.sakhdanil.managmentserver.entity.VaultGroup;
import by.sakhdanil.managmentserver.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, GroupMember.GroupMemberId> {

    Optional<GroupMember> findByGroupAndUser(VaultGroup group, User user);

    List<GroupMember> findByGroup(VaultGroup group);

    List<GroupMember> findByGroupAndStatus(VaultGroup group, String status);

    boolean existsByGroupAndUser(VaultGroup group, User user);
}
