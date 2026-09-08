package com.haodaone.software.controller;

import com.haodaone.software.dto.SoftwareDeploymentDTO;
import com.haodaone.software.dto.SoftwarePackageDTO;
import com.haodaone.software.dto.SoftwareVersionDTO;
import com.haodaone.software.service.SoftwareManagementService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/software")
public class SoftwareController {

    private final SoftwareManagementService softwareManagementService;

    public SoftwareController(SoftwareManagementService softwareManagementService) {
        this.softwareManagementService = softwareManagementService;
    }

    @GetMapping("/packages")
    @PreAuthorize("hasAuthority('SOFTWARE_VIEW')")
    public List<SoftwarePackageDTO> listPackages() {
        return softwareManagementService.listPackages();
    }

    @GetMapping("/packages/{id}")
    @PreAuthorize("hasAuthority('SOFTWARE_VIEW')")
    public SoftwarePackageDTO getPackage(@PathVariable Long id) {
        return softwareManagementService.getPackage(id);
    }

    @PostMapping("/packages")
    @PreAuthorize("hasAuthority('SOFTWARE_MANAGE')")
    public ResponseEntity<SoftwarePackageDTO> createPackage(@Valid @RequestBody SoftwarePackageDTO.CreateRequest request) {
        return ResponseEntity.status(201).body(softwareManagementService.createPackage(request));
    }

    @GetMapping("/packages/{packageId}/versions")
    @PreAuthorize("hasAuthority('SOFTWARE_VIEW')")
    public List<SoftwareVersionDTO> listVersions(@PathVariable Long packageId) {
        return softwareManagementService.listVersions(packageId);
    }

    @PostMapping("/packages/{packageId}/versions")
    @PreAuthorize("hasAuthority('SOFTWARE_MANAGE')")
    public ResponseEntity<SoftwareVersionDTO> createVersion(@PathVariable Long packageId,
                                                           @Valid @RequestBody SoftwareVersionDTO.CreateRequest request) {
        return ResponseEntity.status(201).body(softwareManagementService.createVersion(packageId, request));
    }

    @GetMapping("/deployments")
    @PreAuthorize("hasAuthority('SOFTWARE_VIEW') or hasAuthority('SOFTWARE_DEPLOY')")
    public List<SoftwareDeploymentDTO> listDeployments() {
        return softwareManagementService.listDeployments();
    }

    @PostMapping("/deployments")
    @PreAuthorize("hasAuthority('SOFTWARE_DEPLOY') or hasAuthority('SOFTWARE_MANAGE')")
    public ResponseEntity<SoftwareDeploymentDTO> createDeployment(@Valid @RequestBody SoftwareDeploymentDTO.CreateRequest request) {
        return ResponseEntity.status(201).body(softwareManagementService.createDeployment(request));
    }
}
