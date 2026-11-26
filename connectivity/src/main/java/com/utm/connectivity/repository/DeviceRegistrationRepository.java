package com.utm.connectivity.repository;

import com.utm.connectivity.model.DeviceRegistration;
import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.model.enumeration.DeviceRegistrationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceRegistrationRepository extends JpaRepository<DeviceRegistration, String>, JpaSpecificationExecutor<DeviceRegistration> {

    Optional<DeviceRegistration> findByDroneIdAndRegistrationStatusNot(String droneId, DeviceRegistrationStatus status);

    Optional<DeviceRegistration> findFirstByDroneIdOrderByCreatedOnDesc(String droneId);

    Optional<DeviceRegistration> findByDeviceIdentifierAndRegistrationStatusNot(String deviceIdentifier, DeviceRegistrationStatus status);

    Optional<DeviceRegistration> findByDeviceIdentifierIgnoreCaseAndRegistrationStatusNot(String deviceIdentifier, DeviceRegistrationStatus status);

    Optional<DeviceRegistration> findFirstByDeviceIdentifierIgnoreCaseOrderByCreatedOnDesc(String deviceIdentifier);

    Optional<DeviceRegistration> findFirstByIdOrDeviceIdentifierOrDroneIdOrderByCreatedOnDesc(
            String id, String deviceIdentifier, String droneId);

    List<DeviceRegistration> findByConnectionStatus(DeviceConnectionStatus connectionStatus);

    List<DeviceRegistration> findByRegistrationStatusNot(DeviceRegistrationStatus status);

    List<DeviceRegistration> findByDroneIdInAndRegistrationStatusNot(Collection<String> droneIds, DeviceRegistrationStatus status);
}
