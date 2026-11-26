package com.utm.connectivity.service;

import com.utm.connectivity.model.DeviceRegistration;
import com.utm.connectivity.model.enumeration.DeviceRegistrationStatus;
import com.utm.connectivity.model.enumeration.TelemetryMode;
import com.utm.connectivity.repository.DeviceRegistrationRepository;
import com.utm.connectivity.viewmodel.telemetry.DeviceTelemetryModeVm;
import com.utm.connectivity.viewmodel.telemetry.TelemetryModeConfigVm;
import com.utm.connectivity.viewmodel.telemetry.TelemetryRateStatsVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdaptiveRateServiceImpl implements AdaptiveRateService {

    private static final List<TelemetryModeConfigVm> MODE_CONFIGS = List.of(
            new TelemetryModeConfigVm(TelemetryMode.IDLE, 0.033, 30000, "Stationed / standby heartbeat rate (1 msg / 30s)"),
            new TelemetryModeConfigVm(TelemetryMode.NORMAL, 0.5, 2000, "Nominal cruise flight telemetry rate (0.5 Hz)"),
            new TelemetryModeConfigVm(TelemetryMode.ENHANCED, 2.0, 500, "Proximity or terminal approach telemetry rate (2 Hz)"),
            new TelemetryModeConfigVm(TelemetryMode.EMERGENCY, 10.0, 100, "High-frequency incident & blackbox telemetry rate (10 Hz)")
    );

    private final DeviceRegistrationService deviceRegistrationService;
    private final DeviceRegistrationRepository deviceRegistrationRepository;

    @Override
    public List<TelemetryModeConfigVm> getSupportedModes() {
        return MODE_CONFIGS;
    }

    @Override
    @Transactional
    public DeviceTelemetryModeVm setDeviceTelemetryMode(String deviceIdOrKey, TelemetryMode mode, String reason) {
        DeviceRegistration device = deviceRegistrationService.requireEntityByKey(deviceIdOrKey);
        device.setTelemetryMode(mode);
        device.setTelemetryModeReason(reason != null ? reason.trim() : "Manual operator adjustment");
        DeviceRegistration saved = deviceRegistrationRepository.save(device);
        TelemetryModeConfigVm cfg = configFor(mode);
        return new DeviceTelemetryModeVm(
                saved.getId(),
                saved.getDeviceIdentifier(),
                saved.getDroneId(),
                mode,
                saved.getTelemetryModeReason(),
                cfg.rateHz(),
                cfg.intervalMs(),
                ZonedDateTime.now(ZoneOffset.UTC)
        );
    }

    @Override
    @Transactional
    public void onDroneModeTransition(String droneId, TelemetryMode targetMode, String reason) {
        if (droneId == null || droneId.isBlank()) {
            return;
        }
        deviceRegistrationRepository
                .findByDroneIdAndRegistrationStatusNot(droneId.trim(), DeviceRegistrationStatus.REVOKED)
                .ifPresent(device -> {
                    device.setTelemetryMode(targetMode);
                    device.setTelemetryModeReason(reason);
                    deviceRegistrationRepository.save(device);
                    log.info("Transitioned device {} (drone={}) telemetry mode to {} ({})",
                            device.getDeviceIdentifier(), droneId, targetMode, reason);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public TelemetryRateStatsVm getTelemetryStats() {
        List<DeviceRegistration> active = deviceRegistrationRepository
                .findByRegistrationStatusNot(DeviceRegistrationStatus.REVOKED);
        Map<String, Long> byMode = new LinkedHashMap<>();
        for (TelemetryMode mode : TelemetryMode.values()) {
            byMode.put(mode.getValue(), 0L);
        }
        for (DeviceRegistration d : active) {
            TelemetryMode m = d.getTelemetryMode() != null ? d.getTelemetryMode() : TelemetryMode.NORMAL;
            byMode.put(m.getValue(), byMode.getOrDefault(m.getValue(), 0L) + 1L);
        }
        return new TelemetryRateStatsVm(active.size(), byMode);
    }

    private static TelemetryModeConfigVm configFor(TelemetryMode mode) {
        return MODE_CONFIGS.stream()
                .filter(c -> c.mode() == mode)
                .findFirst()
                .orElse(MODE_CONFIGS.get(1));
    }
}
