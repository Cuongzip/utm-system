package com.utm.connectivity.viewmodel.stats;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Protocol adapter statistics and currently connected devices")
public record ProtocolStatsVm(
        List<ProtocolAdapterStatsVm> adapters,
        List<ConnectedDeviceBriefVm> connectedDevices
) {
}
