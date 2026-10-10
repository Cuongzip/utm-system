package com.utm.connectivity.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.connectivity.mapper.DeviceRegistrationMapper;
import com.utm.connectivity.model.DeviceRegistration;
import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.repository.DeviceRegistrationRepository;
import com.utm.connectivity.viewmodel.DeviceHeartbeatPostVm;
import com.utm.connectivity.viewmodel.DeviceRegistrationPostVm;
import com.utm.connectivity.viewmodel.DeviceRegistrationVm;
import com.utm.connectivity.viewmodel.DroneResponseVm;
import com.utm.connectivity.viewmodel.HeartbeatResultVm;
import com.utm.connectivity.viewmodel.RevokeResultVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceRegistrationServiceImpl implements DeviceRegistrationService {

    private final DeviceRegistrationRepository deviceRegistrationRepository;
    private final DroneClientService droneClientService;
    private final DeviceRegistrationMapper mapper;

    @Override
    @Transactional
    public DeviceRegistrationVm registerDevice(DeviceRegistrationPostVm postVm) {
        DroneResponseVm drone = droneClientService.getDroneById(postVm.droneId())
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, postVm.droneId()));

        if (deviceRegistrationRepository.findByDroneId(postVm.droneId()).isPresent()) {
            throw new DuplicatedException(MessageCode.DRONE_ALREADY_HAS_DEVICE_REGISTRATION, postVm.droneId());
        }

        if (deviceRegistrationRepository.findByDeviceIdentifier(postVm.deviceIdentifier()).isPresent()) {
            throw new DuplicatedException(MessageCode.DEVICE_IDENTIFIER_ALREADY_EXISTED, postVm.deviceIdentifier());
        }

        DeviceRegistration registration = mapper.toEntity(postVm);
        DeviceRegistration saved = deviceRegistrationRepository.save(registration);
        return mapper.toVm(saved, drone);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DeviceRegistrationVm> getDevices(DeviceConnectionStatus connectionStatus, Pageable pageable) {
        Page<DeviceRegistration> page;
        if (connectionStatus != null) {
            page = deviceRegistrationRepository.findByConnectionStatus(connectionStatus, pageable);
        } else {
            page = deviceRegistrationRepository.findAll(pageable);
        }

        return page.map(reg -> {
            Optional<DroneResponseVm> droneOpt = droneClientService.getDroneById(reg.getDroneId());
            return mapper.toVm(reg, droneOpt.orElse(null));
        });
    }

    @Override
    @Transactional
    public List<DeviceRegistrationVm> getOnlineDevices() {
        ZonedDateTime cutoff = ZonedDateTime.now().minusSeconds(30);

        List<DeviceRegistration> allOnline = deviceRegistrationRepository.findByConnectionStatus(DeviceConnectionStatus.ONLINE);
        for (DeviceRegistration dev : allOnline) {
            if (dev.getLastSeenAt() == null || dev.getLastSeenAt().isBefore(cutoff)) {
                dev.setConnectionStatus(DeviceConnectionStatus.OFFLINE);
                deviceRegistrationRepository.save(dev);
            }
        }

        List<DeviceRegistration> currentOnline = deviceRegistrationRepository.findByConnectionStatus(DeviceConnectionStatus.ONLINE);
        return currentOnline.stream()
                .map(reg -> {
                    Optional<DroneResponseVm> droneOpt = droneClientService.getDroneById(reg.getDroneId());
                    return mapper.toVm(reg, droneOpt.orElse(null));
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DeviceRegistrationVm getDeviceById(String id) {
        DeviceRegistration reg = deviceRegistrationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.DEVICE_REGISTRATION_NOT_FOUND, id));

        Optional<DroneResponseVm> droneOpt = droneClientService.getDroneById(reg.getDroneId());
        return mapper.toVm(reg, droneOpt.orElse(null));
    }

    @Override
    @Transactional
    public HeartbeatResultVm processHeartbeat(String idOrIdentifier, DeviceHeartbeatPostVm heartbeatVm) {
        DeviceRegistration reg = deviceRegistrationRepository.findByIdOrDeviceIdentifier(idOrIdentifier, idOrIdentifier)
                .orElseThrow(() -> new NotFoundException(MessageCode.DEVICE_REGISTRATION_NOT_FOUND, idOrIdentifier));

        reg.setConnectionStatus(DeviceConnectionStatus.ONLINE);
        reg.setLastSeenAt(ZonedDateTime.now());
        if (heartbeatVm != null && heartbeatVm.socketId() != null && !heartbeatVm.socketId().isBlank()) {
            reg.setSocketId(heartbeatVm.socketId().trim());
        }

        deviceRegistrationRepository.save(reg);
        return new HeartbeatResultVm(true, ZonedDateTime.now());
    }

    @Override
    @Transactional
    public RevokeResultVm revokeDeviceRegistration(String id) {
        DeviceRegistration reg = deviceRegistrationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.DEVICE_REGISTRATION_NOT_FOUND, id));

        Optional<DroneResponseVm> droneOpt = droneClientService.getDroneById(reg.getDroneId());
        if (droneOpt.isPresent()) {
            String status = droneOpt.get().status();
            if (status != null && (status.equalsIgnoreCase("in_flight") || status.equalsIgnoreCase("in_mission"))) {
                throw new BadRequestException(MessageCode.DRONE_IN_FLIGHT_CANNOT_REVOKE, reg.getDroneId());
            }
        }

        deviceRegistrationRepository.delete(reg);
        return new RevokeResultVm("Device registration revoked successfully");
    }
}
