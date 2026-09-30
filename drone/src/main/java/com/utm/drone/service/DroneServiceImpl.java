package com.utm.drone.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.drone.mapper.DroneMapper;
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
    private final DroneMapper droneMapper;

    @Override
    @Transactional(readOnly = true)
    public List<DroneVm> getAllDrones() {
        return droneRepository.findAll().stream()
                .map(droneMapper::toVm)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DroneVm getDroneById(String id) {
        Drone drone = droneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, id));
        return droneMapper.toVm(drone);
    }

    @Override
    @Transactional
    public DroneVm createDrone(DronePostVm dronePostVm) {
        String trimmedRegNumber = dronePostVm.registrationNumber() != null ? dronePostVm.registrationNumber().trim() : "";
        if (droneRepository.existsByRegistrationNumber(trimmedRegNumber)) {
            throw new DuplicatedException(
                    MessageCode.REGISTRATION_NUMBER_ALREADY_EXISTED,
                    dronePostVm.registrationNumber());
        }

        Drone drone = droneMapper.toEntity(dronePostVm);
        Drone savedDrone = droneRepository.save(drone);
        log.info("Created new drone with ID: {} and registration number: {}", savedDrone.getId(),
                savedDrone.getRegistrationNumber());
        return droneMapper.toVm(savedDrone);
    }

    @Override
    @Transactional
    public DroneVm updateDrone(String id, DronePutVm dronePutVm) {
        Drone drone = droneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, id));

        droneMapper.updateEntityFromPutVm(drone, dronePutVm);

        Drone updatedDrone = droneRepository.save(drone);
        log.info("Updated drone with ID: {}", id);
        return droneMapper.toVm(updatedDrone);
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
