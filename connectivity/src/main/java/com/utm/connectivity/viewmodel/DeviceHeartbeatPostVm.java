package com.utm.connectivity.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Payload for device heartbeat signal ping")
public record DeviceHeartbeatPostVm(
        @Schema(description = "WebSocket session ID currently bound to the device", example = "ws-session-abc-123")
        String socketId
) {
}
