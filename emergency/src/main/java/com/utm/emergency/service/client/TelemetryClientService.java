package com.utm.emergency.service.client;

import com.utm.emergency.viewmodel.client.TelemetryStreamVm;

import java.util.Optional;

public interface TelemetryClientService {
    Optional<TelemetryStreamVm> getLatestByDroneId(String droneId);
}
