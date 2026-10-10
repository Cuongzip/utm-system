package com.utm.connectivity.service;

import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.viewmodel.DeviceHeartbeatPostVm;
import com.utm.connectivity.viewmodel.DeviceRegistrationPostVm;
import com.utm.connectivity.viewmodel.DeviceRegistrationVm;
import com.utm.connectivity.viewmodel.HeartbeatResultVm;
import com.utm.connectivity.viewmodel.RevokeResultVm;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface DeviceRegistrationService {

    DeviceRegistrationVm registerDevice(DeviceRegistrationPostVm postVm);

    Page<DeviceRegistrationVm> getDevices(DeviceConnectionStatus connectionStatus, Pageable pageable);

    List<DeviceRegistrationVm> getOnlineDevices();

    DeviceRegistrationVm getDeviceById(String id);

    HeartbeatResultVm processHeartbeat(String idOrIdentifier, DeviceHeartbeatPostVm heartbeatVm);

    RevokeResultVm revokeDeviceRegistration(String id);
}
