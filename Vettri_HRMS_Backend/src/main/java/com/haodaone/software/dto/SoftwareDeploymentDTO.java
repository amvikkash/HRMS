package com.haodaone.software.dto;

import com.haodaone.software.entity.SoftwareDeployment;
import com.haodaone.software.entity.SoftwareDeploymentStatus;

import java.time.LocalDateTime;

public class SoftwareDeploymentDTO {
    private Long id;
    private Long companyId;
    private Long softwareVersionId;
    private Long createdByUserId;
    private SoftwareDeploymentStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String note;

    public static class CreateRequest {
        private Long softwareVersionId;
        private String note;
        private java.util.List<Long> targetDeviceIds;

        public Long getSoftwareVersionId() { return softwareVersionId; }
        public void setSoftwareVersionId(Long softwareVersionId) { this.softwareVersionId = softwareVersionId; }
        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
        public java.util.List<Long> getTargetDeviceIds() { return targetDeviceIds; }
        public void setTargetDeviceIds(java.util.List<Long> targetDeviceIds) { this.targetDeviceIds = targetDeviceIds; }
    }

    public static SoftwareDeploymentDTO from(SoftwareDeployment entity) {
        if (entity == null) return null;
        SoftwareDeploymentDTO dto = new SoftwareDeploymentDTO();
        dto.setId(entity.getId());
        dto.setCompanyId(entity.getCompany() != null ? entity.getCompany().getId() : null);
        dto.setSoftwareVersionId(entity.getSoftwareVersion() != null ? entity.getSoftwareVersion().getId() : null);
        dto.setCreatedByUserId(entity.getCreatedByUserId());
        dto.setStatus(entity.getStatus());
        dto.setStartedAt(entity.getStartedAt());
        dto.setCompletedAt(entity.getCompletedAt());
        dto.setNote(entity.getNote());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }
    public Long getSoftwareVersionId() { return softwareVersionId; }
    public void setSoftwareVersionId(Long softwareVersionId) { this.softwareVersionId = softwareVersionId; }
    public Long getCreatedByUserId() { return createdByUserId; }
    public void setCreatedByUserId(Long createdByUserId) { this.createdByUserId = createdByUserId; }
    public SoftwareDeploymentStatus getStatus() { return status; }
    public void setStatus(SoftwareDeploymentStatus status) { this.status = status; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
