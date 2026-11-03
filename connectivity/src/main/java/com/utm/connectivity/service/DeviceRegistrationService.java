package com.utm.connectivity.service;

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

    List<DeviceRegistrationVm> getOnlineDevices();

    DeviceRegistrationVm getDeviceById(String id);

    HeartbeatResultVm processHeartbeat(String idOrIdentifier, DeviceHeartbeatPostVm heartbeatVm);

    RevokeResultVm revokeDeviceRegistration(String id);
}

