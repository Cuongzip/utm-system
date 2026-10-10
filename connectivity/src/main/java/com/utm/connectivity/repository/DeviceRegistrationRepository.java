package com.utm.connectivity.repository;

import com.utm.connectivity.model.DeviceRegistration;
import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceRegistrationRepository extends JpaRepository<DeviceRegistration, String> {

    Optional<DeviceRegistration> findByDroneId(String droneId);

    Optional<DeviceRegistration> findByDeviceIdentifier(String deviceIdentifier);

    Optional<DeviceRegistration> findByIdOrDeviceIdentifier(String id, String deviceIdentifier);

    Page<DeviceRegistration> findByConnectionStatus(DeviceConnectionStatus connectionStatus, Pageable pageable);

    List<DeviceRegistration> findByConnectionStatus(DeviceConnectionStatus connectionStatus);

    List<DeviceRegistration> findByConnectionStatusAndLastSeenAtBefore(DeviceConnectionStatus connectionStatus, ZonedDateTime cutoff);
}
