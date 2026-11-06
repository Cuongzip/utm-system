package com.utm.connectivity.viewmodel.device;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload for device heartbeat signal ping")
public record DeviceHeartbeatPostVm(
        @Size(max = 100, message = "Socket ID must not exceed 100 characters")
        @Schema(description = "WebSocket session ID currently bound to the device", example = "ws-session-xyz-123")
        String socketId
) {
}
