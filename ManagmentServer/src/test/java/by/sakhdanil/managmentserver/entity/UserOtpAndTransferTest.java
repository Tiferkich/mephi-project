package by.sakhdanil.managmentserver.entity;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Дополнительные тесты для бизнес-логики OTP и transfer token у {@link User}.
 */
class UserOtpAndTransferTest {

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId("u-1");
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setSalt("salt");
        user.setPasswordHash("hash");
    }

    @Test
    void setOtp_StoresCodeTypeAndExpiry() {
        user.setOtp("123456", "EMAIL_VERIFICATION", 5);

        assertEquals("123456", user.getOtpCode());
        assertEquals("EMAIL_VERIFICATION", user.getOtpType());
        assertNotNull(user.getOtpExpiresAt());
        assertTrue(user.getOtpExpiresAt().isAfter(Instant.now()));
    }

    @Test
    void isOtpValid_FreshCodeAndMatchingType_True() {
        user.setOtp("999000", "SYNC_SETUP", 10);

        assertTrue(user.isOtpValid("999000", "SYNC_SETUP"));
    }

    @Test
    void isOtpValid_WrongCode_False() {
        user.setOtp("999000", "SYNC_SETUP", 10);

        assertFalse(user.isOtpValid("000999", "SYNC_SETUP"));
    }

    @Test
    void isOtpValid_WrongType_False() {
        user.setOtp("999000", "SYNC_SETUP", 10);

        assertFalse(user.isOtpValid("999000", "ACCOUNT_RECOVERY"));
    }

    @Test
    void isOtpValid_Expired_False() {
        user.setOtpCode("111111");
        user.setOtpType("EMAIL_VERIFICATION");
        user.setOtpExpiresAt(Instant.now().minusSeconds(60));

        assertFalse(user.isOtpValid("111111", "EMAIL_VERIFICATION"));
    }

    @Test
    void isOtpValid_NoCode_False() {
        assertFalse(user.isOtpValid("any", "SYNC_SETUP"));
    }

    @Test
    void clearOtp_RemovesAllFields() {
        user.setOtp("777777", "SYNC_SETUP", 5);

        user.clearOtp();

        assertNull(user.getOtpCode());
        assertNull(user.getOtpType());
        assertNull(user.getOtpExpiresAt());
    }

    @Test
    void setTransferToken_StoresTokenAndExpiry() {
        user.setTransferToken("tt-token", 15);

        assertEquals("tt-token", user.getTransferToken());
        assertNotNull(user.getTransferTokenExpiresAt());
        assertTrue(user.getTransferTokenExpiresAt().isAfter(Instant.now()));
    }

    @Test
    void isTransferTokenValid_Match_True() {
        user.setTransferToken("tt-token", 15);

        assertTrue(user.isTransferTokenValid("tt-token"));
    }

    @Test
    void isTransferTokenValid_Mismatch_False() {
        user.setTransferToken("tt-token", 15);

        assertFalse(user.isTransferTokenValid("other-token"));
    }

    @Test
    void isTransferTokenValid_Expired_False() {
        user.setTransferToken("tt-token");
        user.setTransferTokenExpiresAt(Instant.now().minusSeconds(60));

        assertFalse(user.isTransferTokenValid("tt-token"));
    }

    @Test
    void clearTransferToken_RemovesTokenAndExpiry() {
        user.setTransferToken("tt-token", 15);

        user.clearTransferToken();

        assertNull(user.getTransferToken());
        assertNull(user.getTransferTokenExpiresAt());
    }

    @Test
    void isEnabled_FollowsEmailVerifiedFlag() {
        user.setEmailVerified(false);
        assertFalse(user.isEnabled());

        user.setEmailVerified(true);
        assertTrue(user.isEnabled());
    }
}
