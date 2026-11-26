package com.utm.drone.service;

import com.utm.drone.model.Drone;
import com.utm.drone.model.enumeration.DroneStatus;
import com.utm.drone.repository.DroneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DroneChargingScheduler {

    private static final double CHARGE_RATE_PCT_PER_MIN = 3.5;

    private final DroneRepository droneRepository;

    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void advanceChargingDrones() {
        List<Drone> chargingDrones = droneRepository.findAllByStatus(DroneStatus.CHARGING);
        if (chargingDrones.isEmpty()) {
            return;
        }
        for (Drone drone : chargingDrones) {
            double current = drone.getCurrentBatteryPct() != null ? drone.getCurrentBatteryPct() : 20.0;
            double next = Math.min(100.0, Math.round((current + CHARGE_RATE_PCT_PER_MIN) * 10.0) / 10.0);
            drone.setCurrentBatteryPct(next);
            if (next >= 100.0) {
                drone.setStatus(DroneStatus.AVAILABLE);
                log.info("Drone {} finished Vertiport charging (100%) and returned to AVAILABLE", drone.getId());
            }
            droneRepository.save(drone);
        }
    }
}
