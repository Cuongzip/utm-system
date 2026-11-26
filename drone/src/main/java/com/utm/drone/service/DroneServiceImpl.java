package com.utm.drone.service;

import com.utm.drone.service.client.ConnectivityClientService;
import com.utm.drone.service.client.HubClientService;
import com.utm.drone.service.client.OrganizationClientService;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.generator.BusinessCodeGenerator;
import com.utm.commonlibrary.generator.CodePatternRule;
import com.utm.drone.mapper.DroneMapper;
import com.utm.drone.model.Drone;
import com.utm.drone.model.enumeration.DroneStatus;
import com.utm.drone.repository.DroneRepository;
import com.utm.drone.viewmodel.client.DeviceRegistrationBriefVm;
import com.utm.drone.viewmodel.drone.DroneListVm;
import com.utm.drone.viewmodel.drone.DronePostVm;
import com.utm.drone.viewmodel.drone.DronePutVm;
import com.utm.drone.viewmodel.drone.DroneVm;
import com.utm.drone.viewmodel.client.HubBriefVm;
import com.utm.drone.viewmodel.client.OrganizationBriefVm;
import jakarta.persistence.criteria.Predicate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class DroneServiceImpl implements DroneService {

    private final DroneRepository droneRepository;
    private final DroneMapper droneMapper;
    private final HubClientService hubClientService;
    private final OrganizationClientService organizationClientService;
    private final ConnectivityClientService connectivityClientService;
    private final TransactionTemplate transactionTemplate;

    @Autowired
    public DroneServiceImpl(
            DroneRepository droneRepository,
            DroneMapper droneMapper,
            HubClientService hubClientService,
            OrganizationClientService organizationClientService,
            @Autowired(required = false) ConnectivityClientService connectivityClientService,
            @Autowired(required = false) TransactionTemplate transactionTemplate) {
        this.droneRepository = droneRepository;
        this.droneMapper = droneMapper;
        this.hubClientService = hubClientService;
        this.organizationClientService = organizationClientService;
        this.connectivityClientService = connectivityClientService;
        this.transactionTemplate = transactionTemplate;
    }

    @Override
    @Transactional(readOnly = true)
    public DroneListVm getDrones(DroneStatus status, String homeHubId, String currentHubId, String ownerId,
            String search, int limit, int offset) {
        Specification<Drone> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (homeHubId != null && !homeHubId.trim().isBlank()) {
                predicates.add(cb.equal(root.get("homeHubId"), homeHubId.trim()));
            }
            if (currentHubId != null && !currentHubId.trim().isBlank()) {
                String hubId = currentHubId.trim();
                predicates.add(cb.or(
                        cb.equal(root.get("currentHubId"), hubId),
                        cb.and(cb.isNull(root.get("currentHubId")), cb.equal(root.get("homeHubId"), hubId))));
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
                    .map(this::mapToVm)
                    .toList();
            return DroneListVm.of(items, items.size());
        }

        int pageSize = limit;
        int pageNumber = offset > 0 ? (offset / pageSize) : 0;
        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "createdOn"));

        Page<Drone> page = droneRepository.findAll(spec, pageable);
        List<DroneVm> items = page.getContent().stream()
                .map(this::mapToVm)
                .toList();

        return DroneListVm.of(items, page.getTotalElements());
    }

    @Override
    public DroneVm getDroneById(String id) {
        return getDroneById(id, true);
    }

    @Override
    public DroneVm getDroneById(String id, boolean enrich) {
        Drone drone = droneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", id));

        if (!enrich) {
            return droneMapper.toVm(drone, null, null, null);
        }

        Optional<OrganizationBriefVm> owner = Optional.empty();
        if (drone.getOwnerId() != null && !drone.getOwnerId().isBlank()) {
            owner = organizationClientService.getOrganizationById(drone.getOwnerId());
        }

        Optional<HubBriefVm> hub = Optional.empty();
        if (drone.getHomeHubId() != null && !drone.getHomeHubId().isBlank()) {
            hub = hubClientService.getHubById(drone.getHomeHubId());
        }

        DeviceRegistrationBriefVm deviceRegistration = connectivityClientService != null
                ? connectivityClientService.getDeviceByDroneId(drone.getId()).orElse(null)
                : null;

        return droneMapper.toVm(drone, owner.orElse(null), hub.orElse(null), deviceRegistration);
    }

    @Override
    public DroneVm createDrone(DronePostVm dronePostVm) {
        String registrationNumber;
        if (dronePostVm.registrationNumber() == null || dronePostVm.registrationNumber().trim().isBlank()) {
            registrationNumber = BusinessCodeGenerator.generateUnique(
                    CodePatternRule.DRONE_REGISTRATION,
                    droneRepository::existsByRegistrationNumber);
        } else {
            registrationNumber = dronePostVm.registrationNumber().trim().toUpperCase();
            if (droneRepository.existsByRegistrationNumber(registrationNumber)) {
                throw new DuplicatedException(
                        MessageCode.REGISTRATION_NUMBER_ALREADY_EXISTED,
                        "registrationNumber",
                        registrationNumber);
            }
        }

        OrganizationBriefVm owner = null;
        if (dronePostVm.ownerId() != null && !dronePostVm.ownerId().trim().isBlank()) {
            String ownerId = dronePostVm.ownerId().trim();
            owner = organizationClientService.getOrganizationById(ownerId)
                    .orElseThrow(() -> new NotFoundException(MessageCode.ORGANIZATION_NOT_FOUND, "id", ownerId));
            validateOrganizationActive(owner);
        }

        HubBriefVm hub = null;
        if (dronePostVm.homeHubId() != null && !dronePostVm.homeHubId().trim().isBlank()) {
            String hubId = dronePostVm.homeHubId().trim();
            hub = hubClientService.getHubById(hubId)
                    .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", hubId));
            validateHubActive(hub);
        }

        if (dronePostVm.currentHubId() != null && !dronePostVm.currentHubId().trim().isBlank()
                && !dronePostVm.currentHubId().trim().equals(dronePostVm.homeHubId() != null ? dronePostVm.homeHubId().trim() : null)) {
            String curHubId = dronePostVm.currentHubId().trim();
            HubBriefVm curHub = hubClientService.getHubById(curHubId)
                    .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", curHubId));
            validateHubActive(curHub);
        }

        Drone savedDrone;
        if (transactionTemplate != null) {
            savedDrone = transactionTemplate.execute(status -> {
                Drone drone = droneMapper.toEntity(dronePostVm);
                drone.setRegistrationNumber(registrationNumber);
                if (drone.getCurrentHubId() == null || drone.getCurrentHubId().isBlank()) {
                    drone.setCurrentHubId(drone.getHomeHubId());
                }
                return droneRepository.saveAndFlush(drone);
            });
        } else {
            Drone drone = droneMapper.toEntity(dronePostVm);
            drone.setRegistrationNumber(registrationNumber);
            if (drone.getCurrentHubId() == null || drone.getCurrentHubId().isBlank()) {
                drone.setCurrentHubId(drone.getHomeHubId());
            }
            savedDrone = droneRepository.saveAndFlush(drone);
        }
        log.info("Created new drone with ID: {} and registration number: {}", savedDrone.getId(),
                savedDrone.getRegistrationNumber());

        return droneMapper.toVm(savedDrone, owner, hub, null);
    }

    @Override
    public DroneVm updateDrone(String id, DronePutVm dronePutVm) {
        Drone drone = droneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", id));

        if (drone.getStatus() == DroneStatus.IN_FLIGHT) {
            boolean changingHub = (dronePutVm.homeHubId() != null
                    && !dronePutVm.homeHubId().trim().equals(drone.getHomeHubId()))
                    || (dronePutVm.currentHubId() != null
                            && !dronePutVm.currentHubId().trim().equals(drone.getCurrentHubId()));
            boolean changingPayload = dronePutVm.maxPayload() != null
                    && !dronePutVm.maxPayload().equals(drone.getMaxPayload());
            boolean changingToUnsafeStatus = dronePutVm.status() == DroneStatus.MAINTENANCE
                    || dronePutVm.status() == DroneStatus.OFFLINE
                    || dronePutVm.status() == DroneStatus.RETIRED;

            if (changingHub || changingPayload || changingToUnsafeStatus) {
                log.warn("Attempted unsafe update for in-flight drone ID: {}", id);
                throw new BadRequestException(MessageCode.DRONE_IN_FLIGHT_CANNOT_UPDATE, "registrationNumber",
                        drone.getRegistrationNumber() != null ? drone.getRegistrationNumber() : id);
            }
        }

        if (dronePutVm.currentHubId() != null && !dronePutVm.currentHubId().trim().isBlank()) {
            String curHubId = dronePutVm.currentHubId().trim();
            HubBriefVm curHub = hubClientService.getHubById(curHubId)
                    .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", curHubId));
            validateHubActive(curHub);
        }

        HubBriefVm hub = null;
        if (dronePutVm.homeHubId() != null && !dronePutVm.homeHubId().trim().isBlank()) {
            String hubId = dronePutVm.homeHubId().trim();
            hub = hubClientService.getHubById(hubId)
                    .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", hubId));
            validateHubActive(hub);
        } else if (drone.getHomeHubId() != null && !drone.getHomeHubId().isBlank()) {
            hub = hubClientService.getHubById(drone.getHomeHubId()).orElse(null);
        }

        Drone updatedDrone;
        if (transactionTemplate != null) {
            updatedDrone = transactionTemplate.execute(status -> {
                Drone managed = droneRepository.findById(id)
                        .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", id));
                droneMapper.updateEntityFromPutVm(managed, dronePutVm);
                return droneRepository.saveAndFlush(managed);
            });
        } else {
            droneMapper.updateEntityFromPutVm(drone, dronePutVm);
            updatedDrone = droneRepository.saveAndFlush(drone);
        }
        log.info("Updated drone with ID: {}", id);

        OrganizationBriefVm owner = (updatedDrone.getOwnerId() != null && !updatedDrone.getOwnerId().isBlank())
                ? organizationClientService.getOrganizationById(updatedDrone.getOwnerId()).orElse(null)
                : null;
        DeviceRegistrationBriefVm deviceRegistration = connectivityClientService != null
                ? connectivityClientService.getDeviceByDroneId(updatedDrone.getId()).orElse(null)
                : null;
        return droneMapper.toVm(updatedDrone, owner, hub, deviceRegistration);
    }

    @Override
    @Transactional
    public void deleteDrone(String id) {
        Drone drone = droneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", id));

        if (drone.getStatus() == DroneStatus.IN_FLIGHT) {
            log.warn("Attempted to delete in-flight drone ID: {}", id);
            throw new BadRequestException(MessageCode.DRONE_IN_FLIGHT_CANNOT_DELETE, "registrationNumber",
                    drone.getRegistrationNumber() != null ? drone.getRegistrationNumber() : id);
        }

        drone.setStatus(DroneStatus.RETIRED);
        droneRepository.save(drone);
        log.info("Retired drone with ID: {}", id);
    }

    private void validateOrganizationActive(OrganizationBriefVm owner) {
        if (owner != null && owner.status() != null && !"active".equalsIgnoreCase(owner.status())) {
            throw new BadRequestException(MessageCode.ORGANIZATION_NOT_ACTIVE, "id", owner.id());
        }
    }

    private void validateHubActive(HubBriefVm hub) {
        if (hub != null && hub.status() != null && !"active".equalsIgnoreCase(hub.status())) {
            throw new BadRequestException(MessageCode.HUB_NOT_ACTIVE, "id", hub.id());
        }
    }

    private DroneVm mapToVm(Drone drone) {
        return droneMapper.toVm(drone, null, null, null);
    }
}
