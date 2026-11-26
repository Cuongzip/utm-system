package com.utm.connectivity.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.generator.BusinessCodeGenerator;
import com.utm.commonlibrary.generator.CodePatternRule;
import com.utm.connectivity.mapper.DeviceRegistrationMapper;
import com.utm.connectivity.model.DeviceRegistration;
import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.model.enumeration.DeviceRegistrationStatus;
import com.utm.connectivity.model.enumeration.DeviceType;
import com.utm.connectivity.model.enumeration.TelemetryMode;
import com.utm.connectivity.repository.DeviceRegistrationRepository;
import com.utm.connectivity.service.client.DroneClientService;
import com.utm.connectivity.service.client.HubClientService;
import com.utm.connectivity.viewmodel.client.DroneBriefVm;
import com.utm.connectivity.viewmodel.device.DeviceHeartbeatPostVm;
import com.utm.connectivity.viewmodel.device.DeviceRegistrationListVm;
import com.utm.connectivity.viewmodel.device.DeviceRegistrationPostVm;
import com.utm.connectivity.viewmodel.device.DeviceRegistrationVm;
import com.utm.connectivity.viewmodel.device.HeartbeatResultVm;
import com.utm.connectivity.viewmodel.device.RevokeResultVm;
import jakarta.persistence.criteria.Predicate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
public class DeviceRegistrationServiceImpl implements DeviceRegistrationService {

    private final DeviceRegistrationRepository deviceRegistrationRepository;
    private final DroneClientService droneClientService;
    private final HubClientService hubClientService;
    private final DeviceRegistrationMapper mapper;

    public DeviceRegistrationServiceImpl(
            DeviceRegistrationRepository deviceRegistrationRepository,
            DroneClientService droneClientService,
            DeviceRegistrationMapper mapper) {
        this(deviceRegistrationRepository, droneClientService, null, mapper);
    }

    @Autowired
    public DeviceRegistrationServiceImpl(
            DeviceRegistrationRepository deviceRegistrationRepository,
            DroneClientService droneClientService,
            @Autowired(required = false) HubClientService hubClientService,
            DeviceRegistrationMapper mapper) {
        this.deviceRegistrationRepository = deviceRegistrationRepository;
        this.droneClientService = droneClientService;
        this.hubClientService = hubClientService;
        this.mapper = mapper;
    }

    @Override
    @Transactional
    public DeviceRegistrationVm registerDevice(DeviceRegistrationPostVm postVm) {
        DeviceType effectiveType = postVm.deviceType() != null ? postVm.deviceType() : DeviceType.DRONE;
        DroneBriefVm drone = null;
        String trimmedDroneId = null;
        String trimmedHubId = postVm.hubId() != null && !postVm.hubId().isBlank() ? postVm.hubId().trim() : null;

        if (effectiveType == DeviceType.DRONE) {
            if (postVm.droneId() == null || postVm.droneId().isBlank()) {
                throw new BadRequestException(MessageCode.DEVICE_TYPE_INVALID_TARGET, "droneId", "required");
            }
            trimmedDroneId = postVm.droneId().trim();
            String lookupDroneId = trimmedDroneId;
            drone = droneClientService.getDroneById(lookupDroneId)
                    .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", lookupDroneId));

            if (deviceRegistrationRepository
                    .findByDroneIdAndRegistrationStatusNot(trimmedDroneId, DeviceRegistrationStatus.REVOKED).isPresent()) {
                throw new DuplicatedException(MessageCode.DRONE_ALREADY_HAS_DEVICE_REGISTRATION, "registrationNumber",
                        drone.registrationNumber() != null ? drone.registrationNumber() : trimmedDroneId);
            }
        } else if (effectiveType == DeviceType.GATEWAY) {
            if (trimmedHubId == null) {
                throw new BadRequestException(MessageCode.DEVICE_TYPE_INVALID_TARGET, "hubId", "required");
            }
            if (hubClientService != null && hubClientService.getHubById(trimmedHubId).isEmpty()) {
                throw new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", trimmedHubId);
            }
        }

        String trimmedIdentifier;
        if (postVm.deviceIdentifier() == null || postVm.deviceIdentifier().trim().isBlank()) {
            if (effectiveType == DeviceType.GATEWAY) {
                trimmedIdentifier = "GATEWAY-" + trimmedHubId.toUpperCase(Locale.ROOT);
            } else if (effectiveType == DeviceType.GCS) {
                trimmedIdentifier = "GCS-" + System.currentTimeMillis();
            } else {
                trimmedIdentifier = BusinessCodeGenerator.generateUnique(
                        CodePatternRule.DEVICE_IDENTIFIER,
                        id -> deviceRegistrationRepository
                                .findByDeviceIdentifierAndRegistrationStatusNot(id, DeviceRegistrationStatus.REVOKED)
                                .isPresent());
            }
        } else {
            trimmedIdentifier = postVm.deviceIdentifier().trim().toUpperCase(Locale.ROOT);
            if (deviceRegistrationRepository
                    .findByDeviceIdentifierAndRegistrationStatusNot(trimmedIdentifier, DeviceRegistrationStatus.REVOKED)
                    .isPresent()) {
                throw new DuplicatedException(MessageCode.DEVICE_IDENTIFIER_ALREADY_EXISTED, "identifier",
                        trimmedIdentifier);
            }
        }

        Optional<DeviceRegistration> revokedMatch = deviceRegistrationRepository
                .findFirstByDeviceIdentifierIgnoreCaseOrderByCreatedOnDesc(trimmedIdentifier)
                .filter(existing -> existing.getRegistrationStatus() == DeviceRegistrationStatus.REVOKED);

        DeviceRegistration registration;
        if (revokedMatch.isPresent()) {
            registration = revokedMatch.get();
            registration.setDeviceType(effectiveType);
            registration.setDroneId(trimmedDroneId);
            registration.setHubId(trimmedHubId);
            registration.setDeviceIdentifier(trimmedIdentifier);
            registration.setRegistrationStatus(DeviceRegistrationStatus.ACTIVE);
            registration.setConnectionStatus(DeviceConnectionStatus.OFFLINE);
            registration.setSocketId(null);
            if (postVm.certificateFingerprint() != null && !postVm.certificateFingerprint().isBlank()) {
                registration.setCertificateFingerprint(postVm.certificateFingerprint().trim());
            }
            if (postVm.supportedProtocols() != null && !postVm.supportedProtocols().isEmpty()) {
                registration.setSupportedProtocols(postVm.supportedProtocols());
            }
            if (postVm.metadata() != null) {
                registration.setMetadata(postVm.metadata());
            }
            if (registration.getTelemetryMode() == null) {
                registration.setTelemetryMode(TelemetryMode.NORMAL);
            }
        } else {
            registration = mapper.toEntity(postVm);
            registration.setDeviceType(effectiveType);
            registration.setDroneId(trimmedDroneId);
            registration.setHubId(trimmedHubId);
            registration.setDeviceIdentifier(trimmedIdentifier);
            if (registration.getRegistrationStatus() == null) {
                registration.setRegistrationStatus(DeviceRegistrationStatus.ACTIVE);
            }
            if (registration.getTelemetryMode() == null) {
                registration.setTelemetryMode(TelemetryMode.NORMAL);
            }
        }

        DeviceRegistration saved = deviceRegistrationRepository.save(registration);
        log.info("Registered {} device {} (drone={}, hub={}, reactivated={})",
                effectiveType, trimmedIdentifier, trimmedDroneId, trimmedHubId, revokedMatch.isPresent());
        return mapper.toVm(saved, drone);
    }

    @Override
    @Transactional(readOnly = true)
    public DeviceRegistrationListVm getDevices(DeviceConnectionStatus connectionStatus, String search, int limit,
            int offset) {
        return getDevices(connectionStatus, null, search, limit, offset);
    }

    @Override
    @Transactional(readOnly = true)
    public DeviceRegistrationListVm getDevices(
            DeviceConnectionStatus connectionStatus,
            String hubId,
            String search,
            int limit,
            int offset) {
        Specification<DeviceRegistration> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.notEqual(root.get("registrationStatus"), DeviceRegistrationStatus.REVOKED));
            if (connectionStatus != null) {
                predicates.add(cb.equal(root.get("connectionStatus"), connectionStatus));
            }
            if (hubId != null && !hubId.trim().isBlank()) {
                predicates.add(cb.equal(root.get("hubId"), hubId.trim()));
            }
            if (search != null && !search.trim().isBlank()) {
                String searchPattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("deviceIdentifier")), searchPattern),
                        cb.like(cb.lower(root.get("droneId")), searchPattern)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        if (limit <= 0) {
            List<DeviceRegistration> all = deviceRegistrationRepository.findAll(spec,
                    Sort.by(Sort.Direction.DESC, "createdOn"));
            List<DeviceRegistrationVm> items = enrichWithDrones(all);
            return DeviceRegistrationListVm.of(items, items.size());
        }

        int pageSize = limit;
        int pageNumber = Math.max(0, offset) / pageSize;
        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "createdOn"));

        Page<DeviceRegistration> page = deviceRegistrationRepository.findAll(spec, pageable);
        List<DeviceRegistrationVm> items = enrichWithDrones(page.getContent());

        return DeviceRegistrationListVm.of(items, page.getTotalElements());
    }

    @Override
    @Transactional
    public List<DeviceRegistrationVm> getOnlineDevices() {
        ZonedDateTime cutoff = ZonedDateTime.now().minusSeconds(30);

        List<DeviceRegistration> allOnline = deviceRegistrationRepository
                .findByConnectionStatus(DeviceConnectionStatus.ONLINE);
        List<DeviceRegistration> expired = new ArrayList<>();
        List<DeviceRegistration> stillOnline = new ArrayList<>();

        for (DeviceRegistration dev : allOnline) {
            if (dev.getRegistrationStatus() == DeviceRegistrationStatus.REVOKED
                    || dev.getLastSeenAt() == null
                    || dev.getLastSeenAt().isBefore(cutoff)) {
                dev.setConnectionStatus(DeviceConnectionStatus.OFFLINE);
                expired.add(dev);
            } else {
                stillOnline.add(dev);
            }
        }
        if (!expired.isEmpty()) {
            deviceRegistrationRepository.saveAll(expired);
        }

        return enrichWithDrones(stillOnline);
    }

    private List<DeviceRegistrationVm> enrichWithDrones(List<DeviceRegistration> registrations) {
        if (registrations.isEmpty()) {
            return List.of();
        }
        Set<String> droneIds = registrations.stream()
                .map(DeviceRegistration::getDroneId)
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.toSet());
        Map<String, DroneBriefVm> droneMap = droneIds.isEmpty() ? Map.of() : droneClientService.getDronesByIds(droneIds);
        return registrations.stream()
                .map(reg -> mapper.toVm(reg, reg.getDroneId() != null ? droneMap.get(reg.getDroneId()) : null))
                .toList();
    }

    @Scheduled(fixedDelay = 10000)
    @Transactional
    public void sweepExpiredDevices() {
        ZonedDateTime cutoff = ZonedDateTime.now().minusSeconds(30);
        List<DeviceRegistration> allOnline = deviceRegistrationRepository
                .findByConnectionStatus(DeviceConnectionStatus.ONLINE);
        List<DeviceRegistration> expired = new ArrayList<>();
        for (DeviceRegistration dev : allOnline) {
            if (dev.getLastSeenAt() == null || dev.getLastSeenAt().isBefore(cutoff)) {
                dev.setConnectionStatus(DeviceConnectionStatus.OFFLINE);
                expired.add(dev);
            }
        }
        if (!expired.isEmpty()) {
            deviceRegistrationRepository.saveAll(expired);
            log.info("Connectivity sweeper marked {} stale device(s) OFFLINE (cutoff: 30s)", expired.size());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public DeviceRegistration requireEntityByKey(String idOrIdentifier) {
        String trimmedKey = idOrIdentifier != null ? idOrIdentifier.trim() : "";
        return findDeviceByKey(trimmedKey)
                .orElseThrow(() -> new NotFoundException(MessageCode.DEVICE_REGISTRATION_NOT_FOUND, "id", trimmedKey));
    }

    private Optional<DeviceRegistration> findDeviceByKey(String trimmedKey) {
        Optional<DeviceRegistration> byId = deviceRegistrationRepository.findById(trimmedKey);
        if (byId.isPresent()) {
            return byId;
        }
        Optional<DeviceRegistration> byActiveDrone = deviceRegistrationRepository
                .findByDroneIdAndRegistrationStatusNot(trimmedKey, DeviceRegistrationStatus.REVOKED);
        if (byActiveDrone.isPresent()) {
            return byActiveDrone;
        }
        Optional<DeviceRegistration> byActiveIdentifier = deviceRegistrationRepository
                .findByDeviceIdentifierIgnoreCaseAndRegistrationStatusNot(trimmedKey, DeviceRegistrationStatus.REVOKED);
        if (byActiveIdentifier.isPresent()) {
            return byActiveIdentifier;
        }
        String upper = trimmedKey.toUpperCase(Locale.ROOT);
        return deviceRegistrationRepository.findFirstByIdOrDeviceIdentifierOrDroneIdOrderByCreatedOnDesc(
                trimmedKey, upper, trimmedKey);
    }

    @Override
    @Transactional(readOnly = true)
    public DeviceRegistrationVm getDeviceById(String id) {
        return getDeviceById(id, true);
    }

    @Override
    @Transactional(readOnly = true)
    public DeviceRegistrationVm getDeviceById(String id, boolean enrich) {
        DeviceRegistration reg = requireEntityByKey(id);
        Optional<DroneBriefVm> droneOpt = (enrich && reg.getDroneId() != null)
                ? droneClientService.getDroneById(reg.getDroneId())
                : Optional.empty();
        return mapper.toVm(reg, droneOpt.orElse(null));
    }

    @Override
    @Transactional
    public HeartbeatResultVm processHeartbeat(String idOrIdentifier, DeviceHeartbeatPostVm heartbeatVm) {
        DeviceRegistration reg = requireEntityByKey(idOrIdentifier);

        if (reg.getRegistrationStatus() == DeviceRegistrationStatus.REVOKED) {
            throw new BadRequestException("Device registration has been revoked");
        }

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
    public HeartbeatResultVm disconnectDevice(String idOrIdentifier) {
        DeviceRegistration reg = requireEntityByKey(idOrIdentifier);
        reg.setConnectionStatus(DeviceConnectionStatus.OFFLINE);
        reg.setSocketId(null);
        deviceRegistrationRepository.save(reg);
        return new HeartbeatResultVm(true, ZonedDateTime.now());
    }

    @Override
    @Transactional
    public RevokeResultVm revokeDeviceRegistration(String id) {
        DeviceRegistration reg = requireEntityByKey(id);

        if (reg.getDroneId() != null) {
            Optional<DroneBriefVm> droneOpt = droneClientService.getDroneById(reg.getDroneId());
            if (droneOpt.isPresent()) {
                String status = droneOpt.get().status();
                if (status != null && status.equalsIgnoreCase("in_flight")) {
                    throw new BadRequestException(MessageCode.DRONE_IN_FLIGHT_CANNOT_REVOKE, "registrationNumber",
                            droneOpt.get().registrationNumber() != null ? droneOpt.get().registrationNumber() : reg.getDroneId());
                }
            }
        }

        reg.setRegistrationStatus(DeviceRegistrationStatus.REVOKED);
        reg.setConnectionStatus(DeviceConnectionStatus.OFFLINE);
        reg.setSocketId(null);
        deviceRegistrationRepository.save(reg);
        log.info("Soft-revoked device registration for ID: {}", reg.getId());
        return new RevokeResultVm("Device registration revoked successfully");
    }
}
