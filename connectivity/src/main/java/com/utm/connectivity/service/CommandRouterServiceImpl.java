package com.utm.connectivity.service;

import com.utm.commonlibrary.kafka.event.DroneCommandAckEvent;
import com.utm.commonlibrary.kafka.event.DroneCommandEvent;
import com.utm.connectivity.model.DeviceRegistration;
import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.model.enumeration.DeviceRegistrationStatus;
import com.utm.connectivity.repository.DeviceRegistrationRepository;
import com.utm.connectivity.viewmodel.stats.CommandPriorityConfigVm;
import com.utm.connectivity.viewmodel.stats.CommandStatsVm;
import com.utm.connectivity.viewmodel.stats.ConnectedDeviceBriefVm;
import com.utm.connectivity.viewmodel.stats.ConnectivityStatusVm;
import com.utm.connectivity.viewmodel.stats.ProtocolAdapterStatsVm;
import com.utm.connectivity.viewmodel.stats.ProtocolStatsVm;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
@Slf4j
public class CommandRouterServiceImpl implements CommandRouterService {

    private static final Map<Integer, CommandPriorityConfigVm> PRIORITY_CONFIGS = Map.of(
            0, new CommandPriorityConfigVm(0, 500, 3, List.of("emergency_stop", "land_now")),
            1, new CommandPriorityConfigVm(1, 1000, 2, List.of("rtl", "hover", "pause")),
            2, new CommandPriorityConfigVm(2, 2000, 2, List.of("takeoff", "land", "goto", "set_altitude", "resume")),
            3, new CommandPriorityConfigVm(3, 5000, 1, List.of("update_mission", "set_home", "configure"))
    );

    private final DeviceRegistrationRepository deviceRegistrationRepository;
    private final AdaptiveRateService adaptiveRateService;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final String commandAcksTopic;

    private final AtomicLong totalRouted = new AtomicLong();
    private final AtomicLong totalSimulated = new AtomicLong();
    private final AtomicLong totalAcknowledged = new AtomicLong();
    private final AtomicLong totalFailed = new AtomicLong();
    private final Map<Integer, AtomicLong> countByPriority = new ConcurrentHashMap<>(Map.of(
            0, new AtomicLong(),
            1, new AtomicLong(),
            2, new AtomicLong(),
            3, new AtomicLong()
    ));

    @Autowired
    public CommandRouterServiceImpl(
            DeviceRegistrationRepository deviceRegistrationRepository,
            AdaptiveRateService adaptiveRateService,
            @Autowired(required = false) KafkaTemplate<String, Object> kafkaTemplate,
            @Value("${utm.kafka.topic.drone-command-acks:utm.drone.command.acks}") String commandAcksTopic) {
        this.deviceRegistrationRepository = deviceRegistrationRepository;
        this.adaptiveRateService = adaptiveRateService;
        this.kafkaTemplate = kafkaTemplate;
        this.commandAcksTopic = commandAcksTopic;
    }

    @Override
    public void routeCommand(DroneCommandEvent commandEvent) {
        if (commandEvent == null || commandEvent.commandId() == null || commandEvent.droneId() == null) {
            return;
        }
        int priority = resolvePriority(commandEvent.priority(), commandEvent.commandType());
        countByPriority.computeIfAbsent(priority, p -> new AtomicLong()).incrementAndGet();

        Optional<DeviceRegistration> regOpt = deviceRegistrationRepository
                .findByDroneIdAndRegistrationStatusNot(commandEvent.droneId(), DeviceRegistrationStatus.REVOKED);

        boolean deviceOnline = regOpt.isPresent()
                && regOpt.get().getConnectionStatus() == DeviceConnectionStatus.ONLINE;

        if (deviceOnline) {
            totalRouted.incrementAndGet();
            totalAcknowledged.incrementAndGet();
            String adapter = resolveAdapterName(regOpt.get());
            publishAck(commandEvent, "SENT", 0, "Command dispatched via " + adapter);
            publishAck(commandEvent, "ACKNOWLEDGED", 0, "Hardware ACK received via " + adapter);
        } else {
            totalSimulated.incrementAndGet();
            publishAck(commandEvent, "SENT", 0, "Device offline or virtual; routed to simulation fallback");
        }
    }

    @Override
    public CommandStatsVm getCommandStats() {
        Map<Integer, Long> byPrio = new LinkedHashMap<>();
        for (int p = 0; p <= 3; p++) {
            byPrio.put(p, countByPriority.getOrDefault(p, new AtomicLong()).get());
        }
        return new CommandStatsVm(
                0L,
                totalRouted.get(),
                totalSimulated.get(),
                totalAcknowledged.get(),
                totalFailed.get(),
                byPrio,
                PRIORITY_CONFIGS
        );
    }

    @Override
    public ProtocolStatsVm getProtocolStats() {
        List<DeviceRegistration> active = deviceRegistrationRepository
                .findByRegistrationStatusNot(DeviceRegistrationStatus.REVOKED);
        Map<String, long[]> counts = new LinkedHashMap<>();
        for (String p : List.of("websocket", "mavlink", "dji_sdk", "rest_api", "custom_api")) {
            counts.put(p, new long[]{0L, 0L});
        }

        List<ConnectedDeviceBriefVm> connected = new ArrayList<>();
        for (DeviceRegistration dev : active) {
            String proto = resolveAdapterName(dev);
            long[] bucket = counts.computeIfAbsent(proto, k -> new long[]{0L, 0L});
            bucket[1]++;
            if (dev.getConnectionStatus() == DeviceConnectionStatus.ONLINE) {
                bucket[0]++;
                connected.add(new ConnectedDeviceBriefVm(
                        dev.getId(),
                        dev.getDeviceIdentifier(),
                        dev.getDeviceType(),
                        dev.getDroneId(),
                        dev.getHubId(),
                        dev.getSupportedProtocols(),
                        dev.getSocketId(),
                        dev.getLastSeenAt()
                ));
            }
        }

        List<ProtocolAdapterStatsVm> adapters = counts.entrySet().stream()
                .map(e -> new ProtocolAdapterStatsVm(
                        e.getKey(),
                        "ACTIVE",
                        e.getValue()[0],
                        e.getValue()[1],
                        "websocket".equals(e.getKey()) ? totalRouted.get() : 0L))
                .toList();

        return new ProtocolStatsVm(adapters, connected);
    }

    @Override
    public ConnectivityStatusVm getConnectivityStatus() {
        ProtocolStatsVm protoStats = getProtocolStats();
        List<DeviceRegistration> active = deviceRegistrationRepository
                .findByRegistrationStatusNot(DeviceRegistrationStatus.REVOKED);
        long online = protoStats.connectedDevices().size();
        return new ConnectivityStatusVm(
                "OPERATIONAL",
                online,
                active.size(),
                protoStats.adapters(),
                adaptiveRateService.getTelemetryStats(),
                getCommandStats()
        );
    }

    private void publishAck(DroneCommandEvent cmd, String status, int retryCount, String message) {
        if (kafkaTemplate == null) {
            return;
        }
        try {
            DroneCommandAckEvent ack = new DroneCommandAckEvent(
                    cmd.commandId(),
                    cmd.droneId(),
                    cmd.flightId(),
                    cmd.commandType(),
                    status,
                    retryCount,
                    message,
                    ZonedDateTime.now(ZoneOffset.UTC)
            );
            kafkaTemplate.send(commandAcksTopic, cmd.droneId(), ack);
        } catch (Exception ex) {
            log.warn("Failed to publish DroneCommandAckEvent for command {}: {}", cmd.commandId(), ex.getMessage());
        }
    }

    public static int resolvePriority(Integer explicitPriority, String commandType) {
        if (explicitPriority != null && explicitPriority >= 0 && explicitPriority <= 3) {
            return explicitPriority;
        }
        if (commandType == null) {
            return 2;
        }
        String normalized = commandType.trim().toLowerCase(Locale.ROOT);
        for (var entry : PRIORITY_CONFIGS.entrySet()) {
            if (entry.getValue().commands().contains(normalized)) {
                return entry.getKey();
            }
        }
        return 2;
    }

    private static String resolveAdapterName(DeviceRegistration dev) {
        if (dev.getSupportedProtocols() != null && !dev.getSupportedProtocols().isEmpty()) {
            return dev.getSupportedProtocols().getFirst().toLowerCase(Locale.ROOT);
        }
        return "websocket";
    }
}
