package by.sakhdanil.managmentserver.dto.user;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtResponseTest {

    @Test
    void compactConstructor_DefaultsTypeToBearer() {
        JwtResponse resp = new JwtResponse("token-1", "user-1", "alice");

        assertEquals("token-1", resp.token());
        assertEquals("Bearer", resp.type());
        assertEquals("user-1", resp.userId());
        assertEquals("alice", resp.username());
    }

    @Test
    void canonicalConstructor_KeepsCustomType() {
        JwtResponse resp = new JwtResponse("token-1", "Custom", "user-1", "alice");

        assertEquals("token-1", resp.token());
        assertEquals("Custom", resp.type());
        assertEquals("user-1", resp.userId());
        assertEquals("alice", resp.username());
    }

    @Test
    void recordEquality_BasedOnAllFields() {
        JwtResponse a = new JwtResponse("t", "u-1", "alice");
        JwtResponse b = new JwtResponse("t", "u-1", "alice");
        JwtResponse c = new JwtResponse("t", "u-2", "alice");

        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, c);
    }
}
