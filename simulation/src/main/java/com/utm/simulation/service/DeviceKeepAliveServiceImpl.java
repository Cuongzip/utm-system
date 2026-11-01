package com.utm.simulation.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceKeepAliveServiceImpl implements DeviceKeepAliveService {

    private final ConnectivityClientService connectivityClientService;

    private final Set<String> activeDeviceIds = ConcurrentHashMap.newKeySet();

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(
            Thread.ofVirtual().name("sim-device-keepalive-", 0).factory()
    );

    @PostConstruct
    public void init() {
        scheduler.scheduleAtFixedRate(this::tickKeepAlive, 10, 10, TimeUnit.SECONDS);
    }

    private void tickKeepAlive() {
        if (activeDeviceIds.isEmpty()) {
            return;
        }
        for (String id : activeDeviceIds) {
            try {
                connectivityClientService.sendHeartbeat(id);
            } catch (NotFoundException ex) {
                log.warn("Device '{}' not found in connectivity service during keepalive tick. Removing from active simulation.", id);
                activeDeviceIds.remove(id);
            } catch (Exception ex) {
                log.warn("Error sending periodic heartbeat for device '{}': {}", id, ex.getMessage());
            }
        }
    }

    @Override
    public void powerOn(String id) {
        if (id == null || id.isBlank()) {
            throw new BadRequestException(MessageCode.DEVICE_REGISTRATION_NOT_FOUND, "Device ID cannot be blank");
        }
        String cleanId = id.trim();

        boolean ok = connectivityClientService.sendHeartbeat(cleanId);
        if (!ok) {
            throw new BadRequestException(MessageCode.DEVICE_REGISTRATION_NOT_FOUND,
                    "Failed to establish initial heartbeat with connectivity service for device: " + cleanId);
        }

        activeDeviceIds.add(cleanId);
        log.info("Device '{}' powered ON in simulation. Periodic keepalive pulse activated.", cleanId);
    }

    @Override
    public void powerOff(String id) {
        if (id == null || id.isBlank()) {
            throw new BadRequestException(MessageCode.DEVICE_REGISTRATION_NOT_FOUND, "Device ID cannot be blank");
        }
        String cleanId = id.trim();
        activeDeviceIds.remove(cleanId);
        log.info("Device '{}' powered OFF in simulation. Periodic keepalive pulse deactivated.", cleanId);
    }

    @PreDestroy
    public void destroy() {
        try {
            scheduler.shutdown();
            if (!scheduler.awaitTermination(2, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
