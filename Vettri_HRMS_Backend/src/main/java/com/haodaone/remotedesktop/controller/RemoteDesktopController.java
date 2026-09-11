package com.haodaone.remotedesktop.controller;

import com.haodaone.remotedesktop.dto.RemoteDesktopDTO;
import com.haodaone.remotedesktop.service.RemoteDesktopService;
import com.haodaone.security.CustomUserPrincipal;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/devices/{deviceId}/remote-desktop")
@PreAuthorize("hasAuthority('MONITORING_MANAGE')")
public class RemoteDesktopController {
    private final RemoteDesktopService service;
    public RemoteDesktopController(RemoteDesktopService service) { this.service = service; }
    @PostMapping("/sessions") public ResponseEntity<RemoteDesktopDTO.Session> start(@PathVariable Long deviceId, @AuthenticationPrincipal CustomUserPrincipal principal) { return ResponseEntity.status(201).body(service.start(deviceId, principal.getId())); }
    @GetMapping("/sessions/{sessionId}") public RemoteDesktopDTO.Session get(@PathVariable Long deviceId, @PathVariable Long sessionId) { return service.get(deviceId, sessionId); }
    @PostMapping("/sessions/{sessionId}/end") public RemoteDesktopDTO.Session end(@PathVariable Long deviceId, @PathVariable Long sessionId) { return service.end(deviceId, sessionId); }
    @GetMapping(value = "/sessions/{sessionId}/frame", produces = MediaType.IMAGE_JPEG_VALUE) public ResponseEntity<byte[]> frame(@PathVariable Long deviceId, @PathVariable Long sessionId) { return ResponseEntity.ok().contentType(service.frameType()).cacheControl(CacheControl.noStore()).body(service.latestFrame(deviceId, sessionId)); }
}