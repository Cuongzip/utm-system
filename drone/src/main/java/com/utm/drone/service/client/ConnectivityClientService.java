package com.utm.drone.service.client;

import com.utm.drone.viewmodel.client.DeviceRegistrationBriefVm;

import java.util.Optional;

public interface ConnectivityClientService {
    Optional<DeviceRegistrationBriefVm> getDeviceByDroneId(String droneId);
}
