package com.utm.connectivity.service;

import com.utm.connectivity.model.DeviceRegistration;
import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.viewmodel.device.DeviceHeartbeatPostVm;
import com.utm.connectivity.viewmodel.device.DeviceRegistrationListVm;
import com.utm.connectivity.viewmodel.device.DeviceRegistrationPostVm;
import com.utm.connectivity.viewmodel.device.DeviceRegistrationVm;
import com.utm.connectivity.viewmodel.device.HeartbeatResultVm;
import com.utm.connectivity.viewmodel.device.RevokeResultVm;

import java.util.List;

public interface DeviceRegistrationService {

    DeviceRegistrationVm registerDevice(DeviceRegistrationPostVm postVm);

    DeviceRegistrationListVm getDevices(DeviceConnectionStatus connectionStatus, String search, int limit, int offset);

    default DeviceRegistrationListVm getDevices(
            DeviceConnectionStatus connectionStatus,
            String hubId,
            String search,
            int limit,
            int offset) {
        return getDevices(connectionStatus, search, limit, offset);
    }

    List<DeviceRegistrationVm> getOnlineDevices();

    DeviceRegistrationVm getDeviceById(String id);

    default DeviceRegistrationVm getDeviceById(String id, boolean enrich) {
        return getDeviceById(id);
    }

    DeviceRegistration requireEntityByKey(String idOrIdentifier);

    HeartbeatResultVm processHeartbeat(String idOrIdentifier, DeviceHeartbeatPostVm heartbeatVm);

    default HeartbeatResultVm disconnectDevice(String idOrIdentifier) {
        return new HeartbeatResultVm(true, java.time.ZonedDateTime.now());
    }

    RevokeResultVm revokeDeviceRegistration(String id);
}
