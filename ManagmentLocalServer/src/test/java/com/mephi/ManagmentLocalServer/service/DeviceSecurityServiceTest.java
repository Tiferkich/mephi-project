package com.mephi.ManagmentLocalServer.service;

import com.mephi.ManagmentLocalServer.config.DeviceSecurityProperties;
import com.mephi.ManagmentLocalServer.dto.security.AntivirusProductDto;
import com.mephi.ManagmentLocalServer.dto.security.ClientDeviceSnapshotDto;
import com.mephi.ManagmentLocalServer.dto.security.DeviceSecurityCheckRequest;
import com.mephi.ManagmentLocalServer.dto.security.SecurityCheckResponse;
import com.mephi.ManagmentLocalServer.entity.DeviceSecuritySnapshotEntity;
import com.mephi.ManagmentLocalServer.exception.DeviceSecurityViolationException;
import com.mephi.ManagmentLocalServer.repository.DeviceSecuritySnapshotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeviceSecurityServiceTest {

    @Mock
    private DeviceSecuritySnapshotRepository repository;

    private DeviceSecurityProperties props;

    private DeviceSecurityService service;

    @BeforeEach
    void setUp() {
        props = new DeviceSecurityProperties();
        props.setEnforce(true);
        props.setRequireRealtime(true);
        props.setRequireUpToDate(false);
        props.setMaxSnapshotAgeSeconds(120);
        props.setAllowStubProviders(true);

        service = new DeviceSecurityService(props, repository);
    }

    private DeviceSecurityCheckRequest buildRequest(ClientDeviceSnapshotDto snap) {
        DeviceSecurityCheckRequest req = new DeviceSecurityCheckRequest();
        req.setSnapshot(snap);
        return req;
    }

    private ClientDeviceSnapshotDto winSnapshotWithDefender(boolean realtime, boolean upToDate) {
        ClientDeviceSnapshotDto snap = new ClientDeviceSnapshotDto();
        snap.setPlatform("win32");
        snap.setHostname("PC-1");
        snap.setProviderVersion("windows-1.0");
        snap.setCollectedAt(OffsetDateTime.now(ZoneOffset.UTC).toString());

        AntivirusProductDto av = new AntivirusProductDto();
        av.setName("Windows Defender");
        av.setEnabled(true);
        av.setRealtimeProtection(realtime);
        av.setDefinitionsUpToDate(upToDate);
        snap.setAntivirusProducts(List.of(av));
        return snap;
    }

    @Test
    void isEnforce_DelegatesToProperties() {
        props.setEnforce(false);
        assertFalse(service.isEnforce());

        props.setEnforce(true);
        assertTrue(service.isEnforce());
    }

    @Test
    void evaluate_StaleSnapshot_ReturnsNotAllowedWithStaleReason() {
        ClientDeviceSnapshotDto snap = winSnapshotWithDefender(true, true);
        snap.setCollectedAt(OffsetDateTime.now(ZoneOffset.UTC).minusHours(1).toString());

        SecurityCheckResponse resp = service.evaluate(buildRequest(snap));

        assertFalse(resp.isAllowed());
        assertNotNull(resp.getDenyReason());
        assertNotNull(resp.getCheckId());
        assertNotNull(resp.getPolicy());
        verify(repository).save(any(DeviceSecuritySnapshotEntity.class));
    }

    @Test
    void evaluate_EnforceDisabled_AlwaysAllowedRegardlessOfAv() {
        props.setEnforce(false);
        ClientDeviceSnapshotDto snap = winSnapshotWithDefender(false, false);

        SecurityCheckResponse resp = service.evaluate(buildRequest(snap));

        assertTrue(resp.isAllowed());
        assertNull(resp.getDenyReason());
    }

    @Test
    void evaluate_NonWindowsStubAllowed_WhenAllowStubTrue() {
        ClientDeviceSnapshotDto snap = new ClientDeviceSnapshotDto();
        snap.setPlatform("darwin");
        snap.setHostname("mac-1");
        snap.setProviderVersion("stub");
        snap.setCollectedAt(OffsetDateTime.now(ZoneOffset.UTC).toString());
        snap.setAntivirusProducts(List.of());

        SecurityCheckResponse resp = service.evaluate(buildRequest(snap));

        assertTrue(resp.isAllowed());
        assertNull(resp.getDenyReason());
    }

    @Test
    void evaluate_WindowsWithoutAv_DeniedWithNoAv() {
        ClientDeviceSnapshotDto snap = new ClientDeviceSnapshotDto();
        snap.setPlatform("win32");
        snap.setHostname("PC-1");
        snap.setProviderVersion("windows-1.0");
        snap.setCollectedAt(OffsetDateTime.now(ZoneOffset.UTC).toString());
        snap.setAntivirusProducts(List.of());

        SecurityCheckResponse resp = service.evaluate(buildRequest(snap));

        assertFalse(resp.isAllowed());
        assertNotNull(resp.getDenyReason());

        ArgumentCaptor<DeviceSecuritySnapshotEntity> captor =
                ArgumentCaptor.forClass(DeviceSecuritySnapshotEntity.class);
        verify(repository).save(captor.capture());
        assertFalse(captor.getValue().getAllowed());
    }

    @Test
    void evaluate_WindowsRealtimeOff_DeniedWhenRequireRealtimeTrue() {
        ClientDeviceSnapshotDto snap = winSnapshotWithDefender(false, true);

        SecurityCheckResponse resp = service.evaluate(buildRequest(snap));

        assertFalse(resp.isAllowed());
        assertNotNull(resp.getDenyReason());
    }

    @Test
    void evaluate_WindowsAllOk_Allowed() {
        ClientDeviceSnapshotDto snap = winSnapshotWithDefender(true, true);

        SecurityCheckResponse resp = service.evaluate(buildRequest(snap));

        assertTrue(resp.isAllowed());
        assertNull(resp.getDenyReason());
    }

    @Test
    void evaluate_RequireUpToDateButOutdated_Denied() {
        props.setRequireUpToDate(true);
        ClientDeviceSnapshotDto snap = winSnapshotWithDefender(true, false);

        SecurityCheckResponse resp = service.evaluate(buildRequest(snap));

        assertFalse(resp.isAllowed());
        assertNotNull(resp.getDenyReason());
    }

    @Test
    void evaluate_PolicyMapEchoedInResponse() {
        ClientDeviceSnapshotDto snap = winSnapshotWithDefender(true, true);

        SecurityCheckResponse resp = service.evaluate(buildRequest(snap));

        assertNotNull(resp.getPolicy());
        assertEquals(true, resp.getPolicy().get("enforce"));
        assertEquals(true, resp.getPolicy().get("requireRealtime"));
        assertEquals(false, resp.getPolicy().get("requireUpToDate"));
        assertEquals(120, resp.getPolicy().get("maxSnapshotAgeSeconds"));
        assertEquals(true, resp.getPolicy().get("allowStubProviders"));
    }

    @Test
    void requireRecentAllowedCheck_EnforceFalse_NoOp() {
        props.setEnforce(false);

        assertDoesNotThrow(() -> service.requireRecentAllowedCheck(null));
        verify(repository, never()).findByCheckId(any());
    }

    @Test
    void requireRecentAllowedCheck_NullCheckId_ThrowsNoCheck() {
        DeviceSecurityViolationException ex = assertThrows(
                DeviceSecurityViolationException.class,
                () -> service.requireRecentAllowedCheck(null));
        assertEquals("NO_CHECK", ex.getCode());
    }

    @Test
    void requireRecentAllowedCheck_BlankCheckId_ThrowsNoCheck() {
        DeviceSecurityViolationException ex = assertThrows(
                DeviceSecurityViolationException.class,
                () -> service.requireRecentAllowedCheck("   "));
        assertEquals("NO_CHECK", ex.getCode());
    }

    @Test
    void requireRecentAllowedCheck_UnknownCheckId_ThrowsUnknownCheck() {
        when(repository.findByCheckId("missing")).thenReturn(Optional.empty());

        DeviceSecurityViolationException ex = assertThrows(
                DeviceSecurityViolationException.class,
                () -> service.requireRecentAllowedCheck("missing"));
        assertEquals("UNKNOWN_CHECK", ex.getCode());
    }

    @Test
    void requireRecentAllowedCheck_NotAllowed_ThrowsNotAllowed() {
        DeviceSecuritySnapshotEntity entity = DeviceSecuritySnapshotEntity.builder()
                .checkId("c1")
                .platform("win32")
                .allowed(false)
                .denyReason("ANTIVIRUS_OFF")
                .evaluatedAt(LocalDateTime.now())
                .build();
        when(repository.findByCheckId("c1")).thenReturn(Optional.of(entity));

        DeviceSecurityViolationException ex = assertThrows(
                DeviceSecurityViolationException.class,
                () -> service.requireRecentAllowedCheck("c1"));
        assertEquals("NOT_ALLOWED", ex.getCode());
    }

    @Test
    void requireRecentAllowedCheck_ExpiredCheck_ThrowsExpired() {
        DeviceSecuritySnapshotEntity entity = DeviceSecuritySnapshotEntity.builder()
                .checkId("c2")
                .platform("win32")
                .allowed(true)
                .evaluatedAt(LocalDateTime.now().minusHours(1))
                .build();
        when(repository.findByCheckId("c2")).thenReturn(Optional.of(entity));

        DeviceSecurityViolationException ex = assertThrows(
                DeviceSecurityViolationException.class,
                () -> service.requireRecentAllowedCheck("c2"));
        assertEquals("EXPIRED", ex.getCode());
    }

    @Test
    void requireRecentAllowedCheck_FreshAllowed_Passes() {
        DeviceSecuritySnapshotEntity entity = DeviceSecuritySnapshotEntity.builder()
                .checkId("c3")
                .platform("win32")
                .allowed(true)
                .evaluatedAt(LocalDateTime.now())
                .build();
        when(repository.findByCheckId("c3")).thenReturn(Optional.of(entity));

        assertDoesNotThrow(() -> service.requireRecentAllowedCheck("c3"));
    }

    @Test
    void policy_ReturnsCurrentConfiguration() {
        var policy = service.policy();
        assertEquals(true, policy.get("enforce"));
        assertEquals(true, policy.get("requireRealtime"));
        assertEquals(false, policy.get("requireUpToDate"));
        assertEquals(120, policy.get("maxSnapshotAgeSeconds"));
        assertEquals(true, policy.get("allowStubProviders"));
    }

    @Test
    void lastHistory_DelegatesToRepository() {
        DeviceSecuritySnapshotEntity entity = DeviceSecuritySnapshotEntity.builder()
                .checkId("c1").platform("win32").allowed(true)
                .evaluatedAt(LocalDateTime.now()).build();
        when(repository.findTop20ByOrderByEvaluatedAtDesc()).thenReturn(List.of(entity));

        var result = service.lastHistory();
        assertEquals(1, result.size());
        assertSame(entity, result.get(0));
    }
}
