package com.utm.connectivity.viewmodel.stats;

import com.utm.connectivity.viewmodel.telemetry.TelemetryRateStatsVm;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Overall connectivity module operational status")
public record ConnectivityStatusVm(
        String status,
        long onlineDevices,
        long totalDevices,
        List<ProtocolAdapterStatsVm> protocols,
        TelemetryRateStatsVm telemetry,
        CommandStatsVm commands
) {
}
