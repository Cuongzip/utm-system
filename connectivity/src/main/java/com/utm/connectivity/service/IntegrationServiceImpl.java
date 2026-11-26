package com.utm.connectivity.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.AccessDeniedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.connectivity.model.DeviceRegistration;
import com.utm.connectivity.model.ManufacturerApiKey;
import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.model.enumeration.DeviceRegistrationStatus;
import com.utm.connectivity.model.enumeration.DeviceType;
import com.utm.connectivity.model.enumeration.TelemetryMode;
import com.utm.connectivity.repository.DeviceRegistrationRepository;
import com.utm.connectivity.repository.ManufacturerApiKeyRepository;
import com.utm.connectivity.service.client.DroneClientService;
import com.utm.connectivity.service.client.TelemetryClientService;
import com.utm.connectivity.viewmodel.client.DroneBriefVm;
import com.utm.connectivity.viewmodel.client.DroneCreateClientVm;
import com.utm.connectivity.viewmodel.client.TelemetryIngestClientVm;
import com.utm.connectivity.viewmodel.integration.IntegrationDroneRegisteredVm;
import com.utm.connectivity.viewmodel.integration.IntegrationDroneStatusVm;
import com.utm.connectivity.viewmodel.integration.IntegrationRegisterDronePostVm;
import com.utm.connectivity.viewmodel.integration.IntegrationStatusVm;
import com.utm.connectivity.viewmodel.integration.IntegrationTelemetryPostVm;
import com.utm.connectivity.viewmodel.integration.IntegrationTelemetryResultVm;
import com.utm.connectivity.viewmodel.integration.ManufacturerApiKeyCreatedVm;
import com.utm.connectivity.viewmodel.integration.ManufacturerApiKeyPostVm;
import com.utm.connectivity.viewmodel.integration.ManufacturerApiKeyVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class IntegrationServiceImpl implements IntegrationService {

    private static final String KEY_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final List<String> DEFAULT_SCOPES = List.of("telemetry:write", "drone:register", "status:read");

    private final ManufacturerApiKeyRepository apiKeyRepository;
    private final DeviceRegistrationRepository deviceRegistrationRepository;
    private final DroneClientService droneClientService;
    private final TelemetryClientService telemetryClientService;

    @Override
    @Transactional
    public ManufacturerApiKeyCreatedVm createApiKey(ManufacturerApiKeyPostVm postVm) {
        String rawKey = generateRawApiKey();
        String keyPrefix = rawKey.substring(0, 14);
        String keyHash = sha256Hex(rawKey);
        List<String> scopes = (postVm.scopes() != null && !postVm.scopes().isEmpty())
                ? postVm.scopes()
                : DEFAULT_SCOPES;

        ZonedDateTime expiresAt = postVm.expiresAt();
        if (expiresAt == null && postVm.expiresInDays() != null) {
            expiresAt = ZonedDateTime.now(ZoneOffset.UTC).plusDays(postVm.expiresInDays());
        }

        ManufacturerApiKey entity = new ManufacturerApiKey();
        entity.setName(postVm.name().trim());
        entity.setManufacturerName(postVm.manufacturerName().trim());
        entity.setKeyPrefix(keyPrefix);
        entity.setKeyHash(keyHash);
        entity.setScopes(scopes);
        entity.setActive(true);
        entity.setExpiresAt(expiresAt);

        ManufacturerApiKey saved = apiKeyRepository.saveAndFlush(entity);
        return new ManufacturerApiKeyCreatedVm(rawKey, toVm(saved));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ManufacturerApiKeyVm> listApiKeys() {
        return apiKeyRepository.findAllByOrderByCreatedOnDesc().stream()
                .map(this::toVm)
                .toList();
    }

    @Override
    @Transactional
    public ManufacturerApiKeyVm revokeApiKey(String id) {
        ManufacturerApiKey key = apiKeyRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.API_KEY_NOT_FOUND, "id", id));
        key.setActive(false);
        key.setRevokedAt(ZonedDateTime.now(ZoneOffset.UTC));
        return toVm(apiKeyRepository.saveAndFlush(key));
    }

    @Override
    @Transactional
    public IntegrationTelemetryResultVm ingestManufacturerTelemetry(String rawApiKey, IntegrationTelemetryPostVm postVm) {
        verifyAndTouchKey(rawApiKey, "telemetry:write");
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);

        String resolvedDroneId = resolveDroneId(postVm.droneId());
        String deviceId = null;

        Optional<DeviceRegistration> regOpt = deviceRegistrationRepository
                .findByDroneIdAndRegistrationStatusNot(resolvedDroneId, DeviceRegistrationStatus.REVOKED);
        if (regOpt.isPresent()) {
            DeviceRegistration reg = regOpt.get();
            reg.setConnectionStatus(DeviceConnectionStatus.ONLINE);
            reg.setLastSeenAt(now);
            deviceRegistrationRepository.save(reg);
            deviceId = reg.getId();
        }

        telemetryClientService.forwardTelemetry(new TelemetryIngestClientVm(
                resolvedDroneId,
                postVm.flightId(),
                postVm.latitude(),
                postVm.longitude(),
                postVm.altitude(),
                postVm.speed(),
                postVm.heading(),
                postVm.pitch(),
                postVm.roll(),
                postVm.yaw(),
                postVm.batteryLevel(),
                now,
                postVm.signalStrength(),
                postVm.flightMode(),
                "oem_api"
        ));

        return new IntegrationTelemetryResultVm(true, resolvedDroneId, deviceId, now);
    }

    @Override
    @Transactional
    public IntegrationDroneRegisteredVm registerManufacturerDrone(String rawApiKey, IntegrationRegisterDronePostVm postVm) {
        ManufacturerApiKey apiKey = verifyAndTouchKey(rawApiKey, "drone:register");
        String manufacturer = (postVm.manufacturer() != null && !postVm.manufacturer().isBlank())
                ? postVm.manufacturer().trim()
                : apiKey.getManufacturerName();
        String regNum = postVm.registrationNumber().trim().toUpperCase(Locale.ROOT);

        DroneBriefVm drone = droneClientService.getAllDrones().stream()
                .filter(d -> regNum.equalsIgnoreCase(d.registrationNumber()))
                .findFirst()
                .orElseGet(() -> droneClientService.createDrone(new DroneCreateClientVm(
                        regNum,
                        manufacturer,
                        postVm.model().trim(),
                        postVm.ownerId(),
                        postVm.homeHubId(),
                        postVm.batteryCapacityWh() != null ? postVm.batteryCapacityWh() : 500.0,
                        postVm.maxPayload() != null ? postVm.maxPayload() : 2.5,
                        postVm.maxSpeed() != null ? postVm.maxSpeed() : 15.0,
                        postVm.maxFlightTime() != null ? postVm.maxFlightTime() : 40,
                        postVm.maxRange() != null ? postVm.maxRange() : 20000.0,
                        postVm.serialNumber()
                )).orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, "registrationNumber", regNum)));

        DeviceRegistration device = deviceRegistrationRepository
                .findByDroneIdAndRegistrationStatusNot(drone.id(), DeviceRegistrationStatus.REVOKED)
                .orElseGet(() -> {
                    DeviceRegistration created = new DeviceRegistration();
                    created.setDeviceType(DeviceType.DRONE);
                    created.setDroneId(drone.id());
                    created.setHubId(postVm.homeHubId());
                    created.setDeviceIdentifier("OEM-" + regNum);
                    created.setRegistrationStatus(DeviceRegistrationStatus.ACTIVE);
                    created.setConnectionStatus(DeviceConnectionStatus.ONLINE);
                    created.setTelemetryMode(TelemetryMode.NORMAL);
                    created.setSupportedProtocols(List.of("rest_api"));
                    created.setMetadata(Map.of("manufacturer", manufacturer));
                    created.setLastSeenAt(ZonedDateTime.now(ZoneOffset.UTC));
                    return deviceRegistrationRepository.saveAndFlush(created);
                });

        return new IntegrationDroneRegisteredVm(
                drone.id(),
                drone.registrationNumber(),
                manufacturer,
                drone.model(),
                postVm.serialNumber(),
                drone.status(),
                device.getId(),
                device.getDeviceIdentifier()
        );
    }

    @Override
    @Transactional
    public IntegrationStatusVm getManufacturerStatus(String rawApiKey) {
        ManufacturerApiKey apiKey = verifyAndTouchKey(rawApiKey, "status:read");
        String manufacturer = apiKey.getManufacturerName();

        List<DroneBriefVm> matchingDrones = droneClientService.getAllDrones().stream()
                .filter(d -> d.manufacturer() != null && d.manufacturer().equalsIgnoreCase(manufacturer))
                .toList();

        List<String> droneIds = matchingDrones.stream().map(DroneBriefVm::id).toList();
        Map<String, DeviceRegistration> regMap = droneIds.isEmpty()
                ? Map.of()
                : deviceRegistrationRepository
                        .findByDroneIdInAndRegistrationStatusNot(droneIds, DeviceRegistrationStatus.REVOKED)
                        .stream()
                        .collect(Collectors.toMap(DeviceRegistration::getDroneId, Function.identity(), (a, b) -> a));

        int onlineCount = 0;
        List<IntegrationDroneStatusVm> items = new java.util.ArrayList<>();
        for (DroneBriefVm d : matchingDrones) {
            DeviceRegistration reg = regMap.get(d.id());
            String conn = reg != null ? reg.getConnectionStatus().getValue() : "unregistered";
            if (reg != null && reg.getConnectionStatus() == DeviceConnectionStatus.ONLINE) {
                onlineCount++;
            }
            items.add(new IntegrationDroneStatusVm(
                    d.id(),
                    d.registrationNumber(),
                    d.model(),
                    d.status(),
                    conn,
                    reg != null ? reg.getLastSeenAt() : null
            ));
        }

        return new IntegrationStatusVm(manufacturer, items.size(), onlineCount, items);
    }

    private ManufacturerApiKey verifyAndTouchKey(String rawApiKey, String requiredScope) {
        if (rawApiKey == null || rawApiKey.isBlank()) {
            throw new AccessDeniedException(MessageCode.API_KEY_INVALID_OR_REVOKED);
        }
        String hash = sha256Hex(rawApiKey.trim());
        ManufacturerApiKey key = apiKeyRepository.findByKeyHash(hash)
                .orElseThrow(() -> new AccessDeniedException(MessageCode.API_KEY_INVALID_OR_REVOKED));

        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        if (!key.isActive() || key.getRevokedAt() != null
                || (key.getExpiresAt() != null && now.isAfter(key.getExpiresAt()))) {
            throw new AccessDeniedException(MessageCode.API_KEY_INVALID_OR_REVOKED);
        }
        if (requiredScope != null && (key.getScopes() == null || !key.getScopes().contains(requiredScope))) {
            throw new AccessDeniedException(MessageCode.API_KEY_SCOPE_FORBIDDEN);
        }

        key.setLastUsedAt(now);
        apiKeyRepository.save(key);
        return key;
    }

    private String resolveDroneId(String idOrRegistrationNumber) {
        String trimmed = idOrRegistrationNumber.trim();
        Optional<DroneBriefVm> direct = droneClientService.getDroneById(trimmed);
        if (direct.isPresent()) {
            return direct.get().id();
        }
        return droneClientService.getAllDrones().stream()
                .filter(d -> trimmed.equalsIgnoreCase(d.registrationNumber()))
                .map(DroneBriefVm::id)
                .findFirst()
                .orElse(trimmed);
    }

    private ManufacturerApiKeyVm toVm(ManufacturerApiKey entity) {
        return new ManufacturerApiKeyVm(
                entity.getId(),
                entity.getName(),
                entity.getManufacturerName(),
                entity.getKeyPrefix(),
                entity.getScopes(),
                entity.isActive(),
                entity.getExpiresAt(),
                entity.getLastUsedAt(),
                entity.getRevokedAt(),
                entity.getCreatedOn(),
                entity.getCreatedBy()
        );
    }

    private static String generateRawApiKey() {
        StringBuilder sb = new StringBuilder("utm_live_");
        for (int i = 0; i < 32; i++) {
            sb.append(KEY_CHARS.charAt(RANDOM.nextInt(KEY_CHARS.length())));
        }
        return sb.toString();
    }

    public static String sha256Hex(String raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
