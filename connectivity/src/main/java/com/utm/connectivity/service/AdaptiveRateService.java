package com.utm.connectivity.service;

import com.utm.connectivity.model.enumeration.TelemetryMode;
import com.utm.connectivity.viewmodel.telemetry.DeviceTelemetryModeVm;
import com.utm.connectivity.viewmodel.telemetry.TelemetryModeConfigVm;
import com.utm.connectivity.viewmodel.telemetry.TelemetryRateStatsVm;

import java.util.List;

public interface AdaptiveRateService {

    List<TelemetryModeConfigVm> getSupportedModes();

    DeviceTelemetryModeVm setDeviceTelemetryMode(String deviceIdOrKey, TelemetryMode mode, String reason);

    void onDroneModeTransition(String droneId, TelemetryMode targetMode, String reason);

    TelemetryRateStatsVm getTelemetryStats();
}
