package com.utm.connectivity.viewmodel.stats;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Statistics for a communication protocol adapter")
public record ProtocolAdapterStatsVm(
        String protocol,
        String status,
        long connectedDevices,
        long registeredDevices,
        long messagesRouted
) {
}
