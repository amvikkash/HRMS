package com.haodaone.remotedesktop.dto;

import com.haodaone.remotedesktop.entity.*;
import java.time.LocalDateTime;

public final class RemoteDesktopDTO {
    private RemoteDesktopDTO() { }
    public record Session(Long sessionId, Long deviceId, String deviceName, String status, LocalDateTime createdAt, LocalDateTime startedAt, LocalDateTime endedAt, String failureReason) {
        public static Session from(RemoteDesktopSession s) { return new Session(s.getId(), s.getDevice().getId(), s.getDevice().getDeviceName(), s.getStatus().name(), s.getCreatedAt(), s.getStartedAt(), s.getEndedAt(), s.getFailureReason()); }
    }
    public record AgentSession(String sessionId, String action) { }
    public record AgentFrame(String sessionId, String imageBase64, Integer screenWidth, Integer screenHeight) { }
    public record InputEvent(String type, Integer x, Integer y, String button, Integer delta, Integer virtualKey, Boolean keyDown) { }
    public record AgentInput(String sessionId, String type, Integer x, Integer y, String button, Integer delta, Integer virtualKey, Boolean keyDown) { }
}