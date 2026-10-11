package com.utm.connectivity.service;

import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.viewmodel.DeviceHeartbeatPostVm;
import com.utm.connectivity.viewmodel.DeviceRegistrationListVm;
import com.utm.connectivity.viewmodel.DeviceRegistrationPostVm;
import com.utm.connectivity.viewmodel.DeviceRegistrationVm;
import com.utm.connectivity.viewmodel.HeartbeatResultVm;
import com.utm.connectivity.viewmodel.RevokeResultVm;

import java.util.List;

public interface DeviceRegistrationService {

    DeviceRegistrationVm registerDevice(DeviceRegistrationPostVm postVm);

    DeviceRegistrationListVm getDevices(DeviceConnectionStatus connectionStatus, String search, int limit, int offset);

    List<DeviceRegistrationVm> getOnlineDevices();

    DeviceRegistrationVm getDeviceById(String id);

    HeartbeatResultVm processHeartbeat(String idOrIdentifier, DeviceHeartbeatPostVm heartbeatVm);

    RevokeResultVm revokeDeviceRegistration(String id);
}
