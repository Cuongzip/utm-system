package com.utm.drone.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.drone.mapper.DroneMapper;
import com.utm.drone.model.Drone;
import com.utm.drone.model.enumeration.DroneStatus;
import com.utm.drone.repository.DroneRepository;
import com.utm.drone.viewmodel.DroneListVm;
import com.utm.drone.viewmodel.DronePostVm;
import com.utm.drone.viewmodel.DronePutVm;
import com.utm.drone.viewmodel.DroneVm;
import com.utm.drone.viewmodel.HubBriefVm;
import com.utm.drone.viewmodel.OrganizationBriefVm;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class DroneServiceImpl implements DroneService {

    private final DroneRepository droneRepository;
    private final DroneMapper droneMapper;
    private final HubClientService hubClientService;
    private final OrganizationClientService organizationClientService;

    @Override
    @Transactional(readOnly = true)
    public DroneListVm getDrones(DroneStatus status, String homeHubId, String ownerId, String search, int limit,
            int offset) {
        Specification<Drone> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (homeHubId != null && !homeHubId.trim().isBlank()) {
                predicates.add(cb.equal(root.get("homeHubId"), homeHubId.trim()));
            }
            if (ownerId != null && !ownerId.trim().isBlank()) {
                predicates.add(cb.equal(root.get("ownerId"), ownerId.trim()));
            }
            if (search != null && !search.trim().isBlank()) {
                String searchPattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("registrationNumber")), searchPattern),
                        cb.like(cb.lower(root.get("model")), searchPattern),
                        cb.like(cb.lower(root.get("manufacturer")), searchPattern)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        if (limit <= 0) {
            List<Drone> all = droneRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdOn"));
            List<DroneVm> items = all.stream()
                    .map(this::mapDroneWithConnectivity)
                    .toList();
            return DroneListVm.of(items, items.size());
        }

        int pageSize = limit;
        int pageNumber = offset > 0 ? (offset / pageSize) : 0;
        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "createdOn"));

        Page<Drone> page = droneRepository.findAll(spec, pageable);
        List<DroneVm> items = page.getContent().stream()
                .map(this::mapDroneWithConnectivity)
                .toList();

        return DroneListVm.of(items, page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public DroneVm getDroneById(String id) {
        Drone drone = droneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, id));

        Optional<OrganizationBriefVm> owner = Optional.empty();
        if (drone.getOwnerId() != null && !drone.getOwnerId().isBlank()) {
            owner = organizationClientService.getOrganizationById(drone.getOwnerId());
        }

        Optional<HubBriefVm> hub = Optional.empty();
        if (drone.getHomeHubId() != null && !drone.getHomeHubId().isBlank()) {
            hub = hubClientService.getHubById(drone.getHomeHubId());
        }

        return droneMapper.toVm(drone, owner.orElse(null), hub.orElse(null), null);
    }

    @Override
    @Transactional
    public DroneVm createDrone(DronePostVm dronePostVm) {
        String trimmedRegNumber = dronePostVm.registrationNumber() != null ? dronePostVm.registrationNumber().trim()
                : "";
        if (droneRepository.existsByRegistrationNumber(trimmedRegNumber)) {
            throw new DuplicatedException(
                    MessageCode.REGISTRATION_NUMBER_ALREADY_EXISTED,
                    dronePostVm.registrationNumber());
        }

        if (dronePostVm.ownerId() != null && !dronePostVm.ownerId().trim().isBlank()) {
            String ownerId = dronePostVm.ownerId().trim();
            if (!organizationClientService.checkOrganizationExists(ownerId)) {
                throw new NotFoundException(MessageCode.ORGANIZATION_NOT_FOUND, ownerId);
            }
        }

        if (dronePostVm.homeHubId() != null && !dronePostVm.homeHubId().trim().isBlank()) {
            String hubId = dronePostVm.homeHubId().trim();
            if (!hubClientService.checkHubExists(hubId)) {
                throw new NotFoundException(MessageCode.HUB_NOT_FOUND, hubId);
            }
        }

        Drone drone = droneMapper.toEntity(dronePostVm);
        Drone savedDrone = droneRepository.saveAndFlush(drone);
        log.info("Created new drone with ID: {} and registration number: {}", savedDrone.getId(),
                savedDrone.getRegistrationNumber());

        return getDroneById(savedDrone.getId());
    }

    @Override
    @Transactional
    public DroneVm updateDrone(String id, DronePutVm dronePutVm) {
        Drone drone = droneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, id));

        if (drone.getStatus() == DroneStatus.IN_FLIGHT) {
            boolean changingHub = dronePutVm.homeHubId() != null
                    && !dronePutVm.homeHubId().trim().equals(drone.getHomeHubId());
            boolean changingPayload = dronePutVm.maxPayload() != null
                    && !dronePutVm.maxPayload().equals(drone.getMaxPayload());
            boolean changingToMaintenance = dronePutVm.status() == DroneStatus.MAINTENANCE;

            if (changingHub || changingPayload || changingToMaintenance) {
                log.warn("Attempted unsafe update for in-flight drone ID: {}", id);
                throw new BadRequestException(MessageCode.DRONE_IN_FLIGHT_CANNOT_UPDATE, id);
            }
        }

        if (dronePutVm.homeHubId() != null && !dronePutVm.homeHubId().trim().isBlank()) {
            String hubId = dronePutVm.homeHubId().trim();
            if (!hubClientService.checkHubExists(hubId)) {
                throw new NotFoundException(MessageCode.HUB_NOT_FOUND, hubId);
            }
        }

        droneMapper.updateEntityFromPutVm(drone, dronePutVm);

        Drone updatedDrone = droneRepository.saveAndFlush(drone);
        log.info("Updated drone with ID: {}", id);

        return getDroneById(updatedDrone.getId());
    }

    @Override
    @Transactional
    public void deleteDrone(String id) {
        Drone drone = droneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, id));

        if (drone.getStatus() == DroneStatus.IN_FLIGHT) {
            log.warn("Attempted to delete in-flight drone ID: {}", id);
            throw new BadRequestException(MessageCode.DRONE_IN_FLIGHT_CANNOT_DELETE, id);
        }

        drone.setStatus(DroneStatus.OFFLINE);
        droneRepository.save(drone);
        log.info("Deactivated/offline drone with ID: {}", id);
    }

    private DroneVm mapDroneWithConnectivity(Drone drone) {
        return droneMapper.toVm(drone, null, null, null);
    }
}
