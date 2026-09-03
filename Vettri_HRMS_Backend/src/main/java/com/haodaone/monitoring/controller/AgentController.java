package com.haodaone.monitoring.controller;

import com.haodaone.monitoring.dto.*;
import com.haodaone.monitoring.entity.MonitoredDevice;
import com.haodaone.monitoring.service.AgentIngestService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Device-facing endpoints called by HaodaOne.Agent/Services/
 * ApiClientService.cs - paths ("agent/heartbeat", "agent/activity/batch")
 * and payload shapes are figuixed by that client, not ours to rename.
 * Authenticated by security.AgentTokenAuthenticationFilter (a per-device
 * static bearer token, distinct from the user JWT scheme) rather than
 * permitAll - unlike attendance.controller.AdmsController's biometric
 * devices, this agent CAN attach a bearer token, so we use real auth
 * instead of a network-restriction-only posture.
 *
 * Every response is wrapped in AgentEnvelope to match what ApiClientService
 * deserializes as {@code ApiEnvelope<T>} and reads via {@code envelope?.Data}.
 */
@RestController
@RequestMapping("/api/agent")
public class AgentController {

    private final AgentIngestService agentIngestService;

    public AgentController(AgentIngestService agentIngestService) {
        this.agentIngestService = agentIngestService;
    }

    @PostMapping("/heartbeat")
    public AgentEnvelope<HeartbeatResponseData> heartbeat(@AuthenticationPrincipal MonitoredDevice device,
                                                            @Valid @RequestBody HeartbeatRequest request,
                                                            HttpServletRequest servletRequest) {
        HeartbeatResponseData data = agentIngestService.recordHeartbeat(device, request, servletRequest.getRemoteAddr());
        return AgentEnvelope.ok(data);
    }

    @PostMapping("/activity/batch")
    public AgentEnvelope<ActivityBatchResponseData> activityBatch(@AuthenticationPrincipal MonitoredDevice device,
                                                                    @Valid @RequestBody ActivityBatchRequest request,
                                                                    HttpServletRequest servletRequest) {
        ActivityBatchResponseData data = agentIngestService.recordActivityBatch(device, request, servletRequest.getRemoteAddr());
        return AgentEnvelope.ok(data);
    }
}
