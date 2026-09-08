package com.haodaone.software.dto;

import com.haodaone.software.entity.SoftwareDeploymentTarget;
import com.haodaone.software.entity.SoftwareDeploymentStatus;

import java.time.LocalDateTime;

public class SoftwareDeploymentTargetDTO {
    private Long id;
    private Long deviceId;
    private String deviceName;
    private String employeeName;
    private SoftwareDeploymentStatus status;
    private String installedVersion;
    private String errorMessage;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    public static SoftwareDeploymentTargetDTO from(SoftwareDeploymentTarget target) {
        SoftwareDeploymentTargetDTO dto = new SoftwareDeploymentTargetDTO();
        dto.id = target.getId();
        dto.deviceId = target.getDevice().getId();
        dto.deviceName = target.getDevice().getDeviceName();
        dto.employeeName = target.getEmployee() == null ? null : target.getEmployee().getFullName();
        dto.status = target.getStatus();
        dto.installedVersion = target.getInstalledVersion();
        dto.errorMessage = target.getErrorMessage();
        dto.startedAt = target.getStartedAt();
        dto.completedAt = target.getCompletedAt();
        return dto;
    }

    public Long getId() { return id; }
    public Long getDeviceId() { return deviceId; }
    public String getDeviceName() { return deviceName; }
    public String getEmployeeName() { return employeeName; }
    public SoftwareDeploymentStatus getStatus() { return status; }
    public String getInstalledVersion() { return installedVersion; }
    public String getErrorMessage() { return errorMessage; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
}