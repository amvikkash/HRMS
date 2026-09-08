package com.haodaone.software.service;

import com.haodaone.audit.service.AuditLogService;
import com.haodaone.common.exception.BadRequestException;
import com.haodaone.common.exception.ResourceNotFoundException;
import com.haodaone.company.entity.Company;
import com.haodaone.company.repository.CompanyRepository;
import com.haodaone.monitoring.entity.MonitoredDevice;
import com.haodaone.monitoring.repository.MonitoredDeviceRepository;
import com.haodaone.software.dto.SoftwareDeploymentDTO;
import com.haodaone.software.dto.AgentSoftwareJobDTO;
import com.haodaone.software.dto.AgentSoftwareStatusRequest;
import com.haodaone.software.dto.SoftwarePackageDTO;
import com.haodaone.software.dto.SoftwareVersionDTO;
import com.haodaone.software.entity.*;
import com.haodaone.software.repository.*;
import com.haodaone.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
public class SoftwareManagementService {

    private final SoftwarePackageRepository packageRepository;
    private final SoftwareVersionRepository versionRepository;
    private final SoftwareDeploymentRepository deploymentRepository;
    private final SoftwareDeploymentTargetRepository deploymentTargetRepository;
    private final MonitoredDeviceRepository monitoredDeviceRepository;
    private final CompanyRepository companyRepository;
    private final AuditLogService auditLogService;

    public SoftwareManagementService(SoftwarePackageRepository packageRepository,
                                    SoftwareVersionRepository versionRepository,
                                    SoftwareDeploymentRepository deploymentRepository,
                                    SoftwareDeploymentTargetRepository deploymentTargetRepository,
                                    MonitoredDeviceRepository monitoredDeviceRepository,
                                    CompanyRepository companyRepository,
                                    AuditLogService auditLogService) {
        this.packageRepository = packageRepository;
        this.versionRepository = versionRepository;
        this.deploymentRepository = deploymentRepository;
        this.deploymentTargetRepository = deploymentTargetRepository;
        this.monitoredDeviceRepository = monitoredDeviceRepository;
        this.companyRepository = companyRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<SoftwarePackageDTO> listPackages() {
        Long tenantId = requiredTenant();
        return packageRepository.findByCompany_IdAndDeletedFalseOrderByNameAsc(tenantId)
                .stream().map(SoftwarePackageDTO::from).toList();
    }

    @Transactional(readOnly = true)
    public SoftwarePackageDTO getPackage(Long packageId) {
        Long tenantId = requiredTenant();
        return SoftwarePackageDTO.from(packageRepository.findByIdAndCompany_IdAndDeletedFalse(packageId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Software package not found: " + packageId)));
    }

    @Transactional
    public SoftwarePackageDTO createPackage(SoftwarePackageDTO.CreateRequest request) {
        Long tenantId = requiredTenant();
        if (request == null || request.getName() == null || request.getName().isBlank()) {
            throw new BadRequestException("Software package name is required");
        }
        Company company = companyRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found: " + tenantId));
        if (packageRepository.findByCompany_IdAndDeletedFalseOrderByNameAsc(tenantId).stream()
                .anyMatch(p -> p.getName().equalsIgnoreCase(request.getName().trim()))) {
            throw new BadRequestException("Software package already exists in this company");
        }

        SoftwarePackage entity = new SoftwarePackage();
        entity.setCompany(company);
        entity.setName(request.getName().trim());
        entity.setPublisher(request.getPublisher());
        entity.setDescription(request.getDescription());
        entity.setPlatform(request.getPlatform() == null ? SoftwarePlatform.WINDOWS : request.getPlatform());
        entity.setActive(request.isActive());

        SoftwarePackage saved = packageRepository.save(entity);
        auditLogService.log("SoftwarePackage", saved.getId(), "CREATE", "Created software package '" + saved.getName() + "'");
        return SoftwarePackageDTO.from(saved);
    }

    @Transactional(readOnly = true)
    public List<SoftwareVersionDTO> listVersions(Long packageId) {
        Long tenantId = requiredTenant();
        ensurePackageInCompany(packageId, tenantId);
        return versionRepository.findBySoftwarePackage_IdAndDeletedFalseOrderByVersionDesc(packageId)
                .stream().map(SoftwareVersionDTO::from).toList();
    }

    @Transactional
    public SoftwareVersionDTO createVersion(Long packageId, SoftwareVersionDTO.CreateRequest request) {
        Long tenantId = requiredTenant();
        SoftwarePackage packageEntity = packageRepository.findByIdAndCompany_IdAndDeletedFalse(packageId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Software package not found: " + packageId));

        if (request == null || request.getVersion() == null || request.getVersion().isBlank()) {
            throw new BadRequestException("Software version is required");
        }
        if (versionRepository.findBySoftwarePackage_IdAndDeletedFalseOrderByVersionDesc(packageId).stream()
                .anyMatch(v -> v.getVersion().equalsIgnoreCase(request.getVersion().trim()))) {
            throw new BadRequestException("Version already exists for this package");
        }

        SoftwareVersion version = new SoftwareVersion();
        version.setSoftwarePackage(packageEntity);
        version.setVersion(request.getVersion().trim());
        version.setArchitecture(request.getArchitecture() == null ? "x64" : request.getArchitecture());
        version.setInstallerType(request.getInstallerType() == null ? SoftwareInstallerType.EXE : request.getInstallerType());
        version.setInstallerUrl(request.getInstallerUrl());
        version.setChecksumSha256(request.getChecksumSha256());
        version.setFileSizeBytes(request.getFileSizeBytes());
        version.setSilentInstallArguments(request.getSilentInstallArguments());
        version.setDetectionRule(request.getDetectionRule());
        version.setActive(request.isActive());

        SoftwareVersion saved = versionRepository.save(version);
        auditLogService.log("SoftwareVersion", saved.getId(), "CREATE",
                "Created version '" + saved.getVersion() + "' for package '" + packageEntity.getName() + "'");
        return SoftwareVersionDTO.from(saved);
    }

    @Transactional(readOnly = true)
    public List<SoftwareDeploymentDTO> listDeployments() {
        Long tenantId = requiredTenant();
        return deploymentRepository.findByCompany_IdAndDeletedFalseOrderByCreatedAtDesc(tenantId)
                .stream().map(SoftwareDeploymentDTO::from).toList();
    }

    @Transactional
    public SoftwareDeploymentDTO createDeployment(SoftwareDeploymentDTO.CreateRequest request) {
        Long tenantId = requiredTenant();
        if (request == null) {
            throw new BadRequestException("Deployment request is required");
        }
        if (request.getSoftwareVersionId() == null) {
            throw new BadRequestException("Software version is required");
        }
        if (request.getTargetDeviceIds() == null || request.getTargetDeviceIds().isEmpty()) {
            throw new BadRequestException("At least one target device is required");
        }

        SoftwareVersion version = versionRepository.findByIdAndSoftwarePackage_Company_IdAndDeletedFalse(request.getSoftwareVersionId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Software version not found: " + request.getSoftwareVersionId()));

        Company company = companyRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found: " + tenantId));

        SoftwareDeployment deployment = new SoftwareDeployment();
        deployment.setCompany(company);
        deployment.setSoftwareVersion(version);
        deployment.setCreatedByUserId(null);
        deployment.setStatus(SoftwareDeploymentStatus.PENDING);
        deployment.setStartedAt(LocalDateTime.now());
        deployment.setNote(request.getNote());

        SoftwareDeployment savedDeployment = deploymentRepository.save(deployment);

        for (Long deviceId : request.getTargetDeviceIds()) {
            MonitoredDevice device = monitoredDeviceRepository.findByIdAndCompany_IdAndDeletedFalse(deviceId, tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Device not found in current company: " + deviceId));

            SoftwareDeploymentTarget target = new SoftwareDeploymentTarget();
            target.setDeployment(savedDeployment);
            target.setDevice(device);
            target.setStatus(SoftwareDeploymentStatus.PENDING);
            target.setStartedAt(LocalDateTime.now());
            target.setEmployee(device.getEmployee());
            deploymentTargetRepository.save(target);
        }

        auditLogService.log("SoftwareDeployment", savedDeployment.getId(), "CREATE",
                "Queued software deployment for package '" + version.getSoftwarePackage().getName() + "' to "
                        + request.getTargetDeviceIds().size() + " device(s)");
        return SoftwareDeploymentDTO.from(savedDeployment);
    }

    @Transactional(readOnly = true)
    public List<AgentSoftwareJobDTO> getAgentJobs(MonitoredDevice device) {
        return deploymentTargetRepository.findByDevice_Company_IdAndStatusInAndDeletedFalse(
                        device.getCompany().getId(), List.of(SoftwareDeploymentStatus.PENDING))
                .stream()
                .filter(target -> target.getDevice().getId().equals(device.getId()))
                .map(AgentSoftwareJobDTO::from)
                .toList();
    }

    @Transactional
    public void updateAgentJobStatus(MonitoredDevice device, Long targetId, AgentSoftwareStatusRequest request) {
        SoftwareDeploymentTarget target = deploymentTargetRepository.findByIdAndDevice_IdAndDeletedFalse(targetId, device.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Software deployment target not found: " + targetId));
        SoftwareDeploymentStatus status;
        try {
            status = SoftwareDeploymentStatus.valueOf(request.getStatus().trim().toUpperCase());
        } catch (Exception ex) {
            throw new BadRequestException("Unknown software deployment status");
        }
        target.setStatus(status);
        target.setErrorMessage(request.getErrorMessage());
        target.setInstalledVersion(request.getInstalledVersion());
        if (target.getStartedAt() == null) target.setStartedAt(LocalDateTime.now());
        if (status == SoftwareDeploymentStatus.INSTALLED || status == SoftwareDeploymentStatus.ALREADY_INSTALLED
                || status == SoftwareDeploymentStatus.FAILED || status == SoftwareDeploymentStatus.CANCELLED) {
            target.setCompletedAt(LocalDateTime.now());
        }
        deploymentTargetRepository.save(target);
    }

    private Long requiredTenant() {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            throw new BadRequestException("Company context is required");
        }
        return tenantId;
    }

    private void ensurePackageInCompany(Long packageId, Long tenantId) {
        if (!packageRepository.findByIdAndCompany_IdAndDeletedFalse(packageId, tenantId).isPresent()) {
            throw new ResourceNotFoundException("Software package not found: " + packageId);
        }
    }
}
