package com.utm.drone.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.drone.model.Drone;
import com.utm.drone.model.enumeration.DroneStatus;
import com.utm.drone.repository.DroneRepository;
import com.utm.drone.viewmodel.DronePostVm;
import com.utm.drone.viewmodel.DronePutVm;
import com.utm.drone.viewmodel.DroneVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DroneServiceImpl implements DroneService {

    private final DroneRepository droneRepository;

    @Override
    @Transactional(readOnly = true)
    public List<DroneVm> getAllDrones() {
        return droneRepository.findAll().stream()
                .map(DroneVm::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DroneVm getDroneById(String id) {
        Drone drone = droneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, id));
        return DroneVm.fromEntity(drone);
    }

    @Override
    @Transactional
    public DroneVm createDrone(DronePostVm dronePostVm) {
        if (droneRepository.existsByRegistrationNumber(dronePostVm.registrationNumber())) {
            throw new DuplicatedException(
                    MessageCode.REGISTRATION_NUMBER_ALREADY_EXISTED,
                    dronePostVm.registrationNumber());
        }

        Drone drone = Drone.builder()
                .id(UUID.randomUUID().toString())
                .registrationNumber(dronePostVm.registrationNumber().trim())
                .model(dronePostVm.model().trim())
                .manufacturer(dronePostVm.manufacturer().trim())
                .maxSpeedMps(dronePostVm.maxSpeedMps())
                .maxFlightTimeMin(dronePostVm.maxFlightTimeMin())
                .maxPayloadKg(dronePostVm.maxPayloadKg())
                .status(DroneStatus.AVAILABLE)
                .currentHubId(dronePostVm.currentHubId())
                .notes(dronePostVm.notes())
                .build();

        Drone savedDrone = droneRepository.save(drone);
        log.info("Created new drone with ID: {} and registration number: {}", savedDrone.getId(),
                savedDrone.getRegistrationNumber());
        return DroneVm.fromEntity(savedDrone);
    }

    @Override
    @Transactional
    public DroneVm updateDrone(String id, DronePutVm dronePutVm) {
        Drone drone = droneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, id));

        if (dronePutVm.status() != null) {
            drone.setStatus(dronePutVm.status());
        }
        if (dronePutVm.currentHubId() != null) {
            drone.setCurrentHubId(dronePutVm.currentHubId());
        }
        if (dronePutVm.notes() != null) {
            drone.setNotes(dronePutVm.notes());
        }
        if (dronePutVm.maxSpeedMps() != null) {
            drone.setMaxSpeedMps(dronePutVm.maxSpeedMps());
        }
        if (dronePutVm.maxFlightTimeMin() != null) {
            drone.setMaxFlightTimeMin(dronePutVm.maxFlightTimeMin());
        }
        if (dronePutVm.maxPayloadKg() != null) {
            drone.setMaxPayloadKg(dronePutVm.maxPayloadKg());
        }

        Drone updatedDrone = droneRepository.save(drone);
        log.info("Updated drone with ID: {}", id);
        return DroneVm.fromEntity(updatedDrone);
    }

    @Override
    @Transactional
    public void retireDrone(String id) {
        Drone drone = droneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, id));
        drone.setStatus(DroneStatus.RETIRED);
        droneRepository.save(drone);
        log.info("Retired drone with ID: {}", id);
    }
}
