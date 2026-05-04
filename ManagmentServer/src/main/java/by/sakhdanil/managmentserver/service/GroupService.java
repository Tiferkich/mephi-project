package by.sakhdanil.managmentserver.service;

import by.sakhdanil.managmentserver.dto.group.*;
import by.sakhdanil.managmentserver.entity.*;
import by.sakhdanil.managmentserver.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final VaultGroupRepository groupRepo;
    private final GroupMemberRepository memberRepo;
    private final UserRepository userRepo;

    // ──────────────────────────────────────────── groups ─────────────────────

    @Transactional(readOnly = true)
    public List<GroupResponse> getMyGroups(User currentUser) {
        List<VaultGroup> groups = groupRepo.findAllByMemberUserId(currentUser.getId());
        return groups.stream().map(g -> {
            GroupMember me = memberRepo.findByGroupAndUser(g, currentUser).orElseThrow();
            return toGroupResponse(g, me);
        }).toList();
    }

    @Transactional
    public GroupResponse createGroup(String name, User admin) {
        VaultGroup group = new VaultGroup();
        group.setName(name);
        group.setCreatedBy(admin);
        group = groupRepo.save(group);

        GroupMember adminMember = new GroupMember();
        adminMember.setGroup(group);
        adminMember.setUser(admin);
        adminMember.setRole("ADMIN");
        adminMember.setStatus("PENDING"); // becomes ACTIVE after init
        adminMember.setPermission("WRITE");
        memberRepo.save(adminMember);

        return toGroupResponse(group, adminMember);
    }

    /** Admin delivers wrappedKey and adminPubKey for themselves (init step). */
    @Transactional
    public void initGroup(String groupId, String encryptedGroupKey, String adminPubKey, User admin) {
        VaultGroup group = findGroupOrThrow(groupId);
        GroupMember me = requireAdmin(group, admin);
        me.setEncryptedGroupKey(encryptedGroupKey);
        me.setAdminPubKey(adminPubKey);
        me.setStatus("ACTIVE");
        me.setJoinedAt(Instant.now());
        memberRepo.save(me);
    }

    /** Create a PENDING membership for an invited user (by email). */
    @Transactional
    public void inviteByEmail(String groupId, String email, User admin) {
        VaultGroup group = findGroupOrThrow(groupId);
        requireAdmin(group, admin);

        User invited = userRepo.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "User with email " + email + " not found"));

        if (memberRepo.existsByGroupAndUser(group, invited)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User is already a member");
        }

        GroupMember member = new GroupMember();
        member.setGroup(group);
        member.setUser(invited);
        member.setRole("MEMBER");
        member.setStatus("PENDING");
        member.setPermission("WRITE");
        memberRepo.save(member);
    }

    @Transactional(readOnly = true)
    public List<GroupMemberResponse> getPendingMembers(String groupId, User admin) {
        VaultGroup group = findGroupOrThrow(groupId);
        requireAdmin(group, admin);
        return memberRepo.findByGroupAndStatus(group, "PENDING").stream()
                .map(this::toMemberResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GroupMemberResponse> getAllMembers(String groupId, User currentUser) {
        VaultGroup group = findGroupOrThrow(groupId);
        requireMember(group, currentUser);
        return memberRepo.findByGroup(group).stream()
                .map(this::toMemberResponse)
                .toList();
    }

    /** Admin delivers encrypted group key to a PENDING member → ACTIVE. */
    @Transactional
    public void deliverKey(String groupId, String targetUserId,
                           String encryptedGroupKey, String adminPubKey, User admin) {
        VaultGroup group = findGroupOrThrow(groupId);
        requireAdmin(group, admin);

        User target = userRepo.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        GroupMember member = memberRepo.findByGroupAndUser(group, target)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membership not found"));

        member.setEncryptedGroupKey(encryptedGroupKey);
        member.setAdminPubKey(adminPubKey);
        member.setStatus("ACTIVE");
        member.setJoinedAt(Instant.now());
        memberRepo.save(member);
    }

    /** Admin changes the permission level of a member. */
    @Transactional
    public void setPermission(String groupId, String targetUserId, String permission, User admin) {
        if (!permission.equals("READ") && !permission.equals("WRITE")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Permission must be READ or WRITE");
        }
        VaultGroup group = findGroupOrThrow(groupId);
        requireAdmin(group, admin);

        User target = userRepo.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        GroupMember member = memberRepo.findByGroupAndUser(group, target)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membership not found"));

        if ("ADMIN".equals(member.getRole())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot change admin permission");
        }

        member.setPermission(permission);
        memberRepo.save(member);
    }

    /** Admin removes a member from the group (their group access disappears client-side). */
    @Transactional
    public void removeMember(String groupId, String targetUserId, User admin) {
        VaultGroup group = findGroupOrThrow(groupId);
        requireAdmin(group, admin);

        if (admin.getId().equals(targetUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Admin cannot remove themselves");
        }

        User target = userRepo.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        GroupMember member = memberRepo.findByGroupAndUser(group, target)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membership not found"));

        memberRepo.delete(member);
    }

    // ─────────────────────────────────────── helpers ─────────────────────────

    VaultGroup findGroupOrThrow(String groupId) {
        return groupRepo.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
    }

    GroupMember requireAdmin(VaultGroup group, User user) {
        GroupMember m = memberRepo.findByGroupAndUser(group, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member"));
        if (!"ADMIN".equals(m.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required");
        }
        return m;
    }

    GroupMember requireMember(VaultGroup group, User user) {
        return memberRepo.findByGroupAndUser(group, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member of this group"));
    }

    /** Requires WRITE permission; throws 403 otherwise. */
    GroupMember requireWrite(VaultGroup group, User user) {
        GroupMember m = requireMember(group, user);
        if ("READ".equals(m.getPermission()) && !"ADMIN".equals(m.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Write permission required");
        }
        return m;
    }

    private GroupResponse toGroupResponse(VaultGroup g, GroupMember me) {
        return new GroupResponse(
                g.getId(),
                g.getName(),
                g.getCreatedBy().getId(),
                g.getCreatedAt(),
                me.getRole(),
                me.getStatus(),
                me.getEncryptedGroupKey(),
                me.getAdminPubKey()
        );
    }

    private GroupMemberResponse toMemberResponse(GroupMember m) {
        User u = m.getUser();
        return new GroupMemberResponse(
                u.getId(),
                u.getUsername(),
                u.getEmail(),
                u.getPublicKey(),
                m.getRole(),
                m.getStatus(),
                m.getPermission(),
                m.getJoinedAt()
        );
    }

    public Map<String, Object> getMemberInfo(String groupId, User currentUser) {
        VaultGroup group = findGroupOrThrow(groupId);
        GroupMember me = requireMember(group, currentUser);
        return Map.of(
                "role", me.getRole(),
                "status", me.getStatus(),
                "permission", me.getPermission()
        );
    }
}
