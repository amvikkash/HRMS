package com.haodaone.remotedesktop.service;

import com.haodaone.audit.service.AuditLogService;
import com.haodaone.common.exception.BadRequestException;
import com.haodaone.common.exception.ResourceNotFoundException;
import com.haodaone.monitoring.entity.MonitoredDevice;
import com.haodaone.monitoring.repository.MonitoredDeviceRepository;
import com.haodaone.remotedesktop.dto.RemoteDesktopDTO;
import com.haodaone.remotedesktop.entity.*;
import com.haodaone.remotedesktop.repository.RemoteDesktopSessionRepository;
import com.haodaone.tenant.TenantContext;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RemoteDesktopService {
    private static final List<RemoteDesktopStatus> ACTIVE = List.of(RemoteDesktopStatus.REQUESTED, RemoteDesktopStatus.CONNECTING, RemoteDesktopStatus.CONNECTED);
    private static final List<RemoteDesktopStatus> AGENT_VISIBLE = List.of(RemoteDesktopStatus.REQUESTED, RemoteDesktopStatus.CONNECTING, RemoteDesktopStatus.CONNECTED, RemoteDesktopStatus.CANCELLED);
    private final RemoteDesktopSessionRepository sessionRepository;
    private final MonitoredDeviceRepository deviceRepository;
    private final AuditLogService auditLogService;
    private final Map<Long, Frame> frames = new ConcurrentHashMap<>();

    public RemoteDesktopService(RemoteDesktopSessionRepository sessionRepository, MonitoredDeviceRepository deviceRepository, AuditLogService auditLogService) {
        this.sessionRepository = sessionRepository;
        this.deviceRepository = deviceRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public RemoteDesktopDTO.Session start(Long deviceId, Long requestedBy) {
        Long companyId = tenant();
        MonitoredDevice device = deviceRepository.findByIdAndCompany_IdAndDeletedFalse(deviceId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found in current company: " + deviceId));
        if (!device.isOnline()) throw new BadRequestException("The selected device is currently offline");
        if (!sessionRepository.findByDevice_IdAndStatusInAndDeletedFalse(deviceId, ACTIVE).isEmpty()) throw new BadRequestException("A remote desktop session is already active for this device");
        RemoteDesktopSession session = new RemoteDesktopSession();
        session.setCompany(device.getCompany()); session.setDevice(device); session.setRequestedBy(requestedBy); session.setStatus(RemoteDesktopStatus.REQUESTED);
        RemoteDesktopSession saved = sessionRepository.save(session);
        auditLogService.log("RemoteDesktopSession", saved.getId(), "CREATE", "Remote desktop requested for device '" + device.getDeviceName() + "'");
        return RemoteDesktopDTO.Session.from(saved);
    }

    @Transactional(readOnly = true)
    public RemoteDesktopDTO.Session get(Long deviceId, Long sessionId) {
        return RemoteDesktopDTO.Session.from(find(sessionId, tenant(), deviceId));
    }

    @Transactional
    public RemoteDesktopDTO.Session end(Long deviceId, Long sessionId) {
        RemoteDesktopSession session = find(sessionId, tenant(), deviceId);
        if (ACTIVE.contains(session.getStatus())) { session.setStatus(RemoteDesktopStatus.CANCELLED); session.setEndedAt(LocalDateTime.now()); sessionRepository.save(session); frames.remove(sessionId); auditLogService.log("RemoteDesktopSession", sessionId, "END", "Remote desktop session ended"); }
        return RemoteDesktopDTO.Session.from(session);
    }

    @Transactional(readOnly = true)
    public List<RemoteDesktopDTO.AgentSession> agentRequests(MonitoredDevice device) {
        if (device == null || device.getId() == null) return List.of();
        return sessionRepository.findByDevice_IdAndStatusInAndDeletedFalse(device.getId(), AGENT_VISIBLE).stream()
                .map(s -> new RemoteDesktopDTO.AgentSession(String.valueOf(s.getId()), s.getStatus() == RemoteDesktopStatus.CANCELLED ? "STOP" : "START")).toList();
    }

    @Transactional
    public void receiveFrame(MonitoredDevice device, RemoteDesktopDTO.AgentFrame payload) {
        long id;
        try { id = Long.parseLong(payload.sessionId()); } catch (Exception ex) { throw new BadRequestException("Invalid remote desktop session"); }
        RemoteDesktopSession session = sessionRepository.findByIdAndDevice_IdAndDeletedFalse(id, device.getId()).orElseThrow(() -> new ResourceNotFoundException("Remote desktop session not found"));
        if (!Objects.equals(session.getCompany().getId(), device.getCompany().getId()) || !ACTIVE.contains(session.getStatus())) throw new ResourceNotFoundException("Remote desktop session not found");
        if (payload.imageBase64() == null || payload.imageBase64().length() > 2_000_000) throw new BadRequestException("Screen frame is too large");
        byte[] image;
        try { image = Base64.getDecoder().decode(payload.imageBase64()); } catch (IllegalArgumentException ex) { throw new BadRequestException("Invalid screen frame"); }
        if (image.length == 0 || image.length > 1_500_000) throw new BadRequestException("Screen frame is too large");
        if (session.getStatus() != RemoteDesktopStatus.CONNECTED) { session.setStatus(RemoteDesktopStatus.CONNECTED); session.setStartedAt(LocalDateTime.now()); sessionRepository.save(session); }
        frames.put(id, new Frame(image, System.currentTimeMillis()));
    }

    @Transactional(readOnly = true)
    public byte[] latestFrame(Long deviceId, Long sessionId) {
        find(sessionId, tenant(), deviceId);
        Frame frame = frames.get(sessionId);
        if (frame == null || System.currentTimeMillis() - frame.createdAt() > 10_000) throw new ResourceNotFoundException("No live screen frame available");
        return frame.bytes();
    }

    public MediaType frameType() { return MediaType.IMAGE_JPEG; }
    private RemoteDesktopSession find(Long sessionId, Long companyId, Long deviceId) { return sessionRepository.findByIdAndCompany_IdAndDevice_IdAndDeletedFalse(sessionId, companyId, deviceId).orElseThrow(() -> new ResourceNotFoundException("Remote desktop session not found: " + sessionId)); }
    private Long tenant() { Long id = TenantContext.getCurrentTenant(); if (id == null) throw new BadRequestException("Company context is required"); return id; }
    private record Frame(byte[] bytes, long createdAt) { }
}