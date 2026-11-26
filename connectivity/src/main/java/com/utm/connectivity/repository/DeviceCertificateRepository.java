package com.utm.connectivity.repository;

import com.utm.connectivity.model.DeviceCertificate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceCertificateRepository extends JpaRepository<DeviceCertificate, String> {

    List<DeviceCertificate> findByDeviceRegistrationIdAndRevokedAtIsNull(String deviceRegistrationId);

    Optional<DeviceCertificate> findFirstByDeviceRegistrationIdAndRevokedAtIsNullOrderByIssuedAtDesc(String deviceRegistrationId);

    Optional<DeviceCertificate> findFirstByDeviceRegistrationIdOrderByIssuedAtDesc(String deviceRegistrationId);

    Optional<DeviceCertificate> findByFingerprint(String fingerprint);
}
