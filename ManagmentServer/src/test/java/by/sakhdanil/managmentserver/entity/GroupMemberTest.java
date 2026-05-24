package by.sakhdanil.managmentserver.entity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class GroupMemberTest {

    @Test
    void defaultPermission_IsWrite() {
        GroupMember member = new GroupMember();

        assertEquals("WRITE", member.getPermission());
    }

    @Test
    void encryptedGroupKey_NullByDefault_BeforeAdminWraps() {
        GroupMember member = new GroupMember();

        assertNull(member.getEncryptedGroupKey());
        assertNull(member.getAdminPubKey());
    }

    @Test
    void roleAndStatus_Settable() {
        GroupMember member = new GroupMember();

        member.setRole("ADMIN");
        member.setStatus("PENDING");

        assertEquals("ADMIN", member.getRole());
        assertEquals("PENDING", member.getStatus());
    }

    @Test
    void groupMemberId_EqualsAndHashCode_BasedOnGroupAndUser() {
        GroupMember.GroupMemberId id1 = new GroupMember.GroupMemberId("group-1", "user-1");
        GroupMember.GroupMemberId id2 = new GroupMember.GroupMemberId("group-1", "user-1");
        GroupMember.GroupMemberId id3 = new GroupMember.GroupMemberId("group-2", "user-1");
        GroupMember.GroupMemberId id4 = new GroupMember.GroupMemberId("group-1", "user-2");

        assertEquals(id1, id2);
        assertEquals(id1.hashCode(), id2.hashCode());
        assertNotEquals(id1, id3);
        assertNotEquals(id1, id4);
    }

    @Test
    void permissionCanBeChangedToRead() {
        GroupMember member = new GroupMember();

        member.setPermission("READ");
        assertEquals("READ", member.getPermission());

        member.setPermission("WRITE");
        assertEquals("WRITE", member.getPermission());
    }
}
