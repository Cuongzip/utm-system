package com.utm.hub.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.generator.BusinessCodeGenerator;
import com.utm.commonlibrary.generator.CodePatternRule;
import com.utm.hub.mapper.HubMapper;
import com.utm.hub.model.Hub;
import com.utm.hub.model.enumeration.HubStatus;
import com.utm.hub.repository.HubRepository;
import com.utm.hub.service.client.DroneClientService;
import com.utm.hub.service.client.FlightClientService;
import com.utm.hub.viewmodel.hub.HubListVm;
import com.utm.hub.viewmodel.hub.HubOperationalStatusVm;
import com.utm.hub.viewmodel.hub.HubPostVm;
import com.utm.hub.viewmodel.hub.HubPutVm;
import com.utm.hub.viewmodel.hub.HubVm;
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

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class HubServiceImpl implements HubService {

    private final HubRepository hubRepository;
    private final HubMapper hubMapper;
    private final FlightClientService flightClientService;
    private final DroneClientService droneClientService;
    private final TransactionTemplate transactionTemplate;

    public HubServiceImpl(
            HubRepository hubRepository,
            HubMapper hubMapper,
            FlightClientService flightClientService,
            TransactionTemplate transactionTemplate) {
        this(hubRepository, hubMapper, flightClientService, null, transactionTemplate);
    }

    @Autowired
    public HubServiceImpl(
            HubRepository hubRepository,
            HubMapper hubMapper,
            FlightClientService flightClientService,
            @Autowired(required = false) DroneClientService droneClientService,
            @Autowired(required = false) TransactionTemplate transactionTemplate) {
        this.hubRepository = hubRepository;
        this.hubMapper = hubMapper;
        this.flightClientService = flightClientService;
        this.droneClientService = droneClientService;
        this.transactionTemplate = transactionTemplate;
    }

    @Override
    @Transactional(readOnly = true)
    public HubListVm getHubs(String search, HubStatus status, int limit, int offset) {
        Specification<Hub> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.trim().isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("code")), pattern)));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        if (limit <= 0) {
            List<Hub> all = hubRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdOn"));
            return HubListVm.of(hubMapper.toVmList(all), all.size());
        }

        int pageSize = limit;
        int pageNumber = offset > 0 ? (offset / pageSize) : 0;
        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "createdOn"));

        Page<Hub> page = hubRepository.findAll(spec, pageable);
        return HubListVm.of(hubMapper.toVmList(page.getContent()), page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public HubVm getHubById(String id) {
        Hub hub = hubRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", id));
        return hubMapper.toVm(hub);
    }

    @Override
    @Transactional(readOnly = true)
    public HubOperationalStatusVm getHubOperationalStatus(String id) {
        Hub hub = hubRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", id));
        int maxCap = hub.getMaxSimultaneousDrones() != null ? hub.getMaxSimultaneousDrones() : 10;
        int stationed = droneClientService != null ? droneClientService.countStationedDronesAtHub(id) : 0;
        int activeFlights = flightClientService != null ? flightClientService.countActiveFlightsAtHub(id) : 0;
        int occupied = Math.max(stationed, activeFlights);
        int available = Math.max(0, maxCap - occupied);
        double utilPct = maxCap > 0 ? Math.min(100.0, Math.round((occupied * 1000.0) / maxCap) / 10.0) : 0.0;

        return new HubOperationalStatusVm(
                hub.getId(),
                hub.getCode(),
                hub.getName(),
                hub.getStatus(),
                maxCap,
                stationed,
                activeFlights,
                available,
                utilPct,
                ZonedDateTime.now(ZoneOffset.UTC)
        );
    }

    @Override
    @Transactional
    public HubVm createHub(HubPostVm hubPostVm) {
        String hubCode;
        if (hubPostVm.code() != null && !hubPostVm.code().isBlank()) {
            hubCode = hubPostVm.code().trim().toUpperCase();
            if (hubRepository.existsByCode(hubCode)) {
                throw new DuplicatedException(
                        MessageCode.HUB_CODE_ALREADY_EXISTED,
                        "code",
                        hubCode);
            }
        } else {
            hubCode = BusinessCodeGenerator.generateUnique(
                    CodePatternRule.HUB_CODE,
                    hubRepository::existsByCode);
        }

        Hub hub = hubMapper.toEntity(hubPostVm);
        hub.setCode(hubCode);
        if (hub.getTimezone() == null || hub.getTimezone().isBlank()) {
            hub.setTimezone("Asia/Ho_Chi_Minh");
        }
        validateAirspaceBounds(hub.getAirspaceFloor(), hub.getAirspaceCeiling());
        Hub savedHub = hubRepository.saveAndFlush(hub);
        log.info("Created new Hub with ID: {} and code: {}", savedHub.getId(), savedHub.getCode());
        return hubMapper.toVm(savedHub);
    }

    @Override
    public HubVm updateHub(String id, HubPutVm hubPutVm) {
        Hub hub = hubRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", id));

        Double effectiveFloor = hubPutVm.airspaceFloor() != null ? hubPutVm.airspaceFloor() : hub.getAirspaceFloor();
        Double effectiveCeiling = hubPutVm.airspaceCeiling() != null ? hubPutVm.airspaceCeiling()
                : hub.getAirspaceCeiling();
        validateAirspaceBounds(effectiveFloor, effectiveCeiling);

        boolean closingActiveHub = hub.getStatus() == HubStatus.ACTIVE
                && (hubPutVm.status() == HubStatus.INACTIVE
                || hubPutVm.status() == HubStatus.MAINTENANCE
                || hubPutVm.status() == HubStatus.OFFLINE);
        if (closingActiveHub && flightClientService.hasActiveFlightsAtHub(id)) {
            throw new BadRequestException(MessageCode.HUB_HAS_ACTIVE_FLIGHTS);
        }

        Hub updatedHub;
        if (transactionTemplate != null) {
            updatedHub = transactionTemplate.execute(status -> {
                Hub managed = hubRepository.findById(id)
                        .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", id));
                hubMapper.updateEntityFromPutVm(managed, hubPutVm);
                return hubRepository.saveAndFlush(managed);
            });
        } else {
            hubMapper.updateEntityFromPutVm(hub, hubPutVm);
            updatedHub = hubRepository.saveAndFlush(hub);
        }
        log.info("Updated Hub with ID: {}", id);
        return hubMapper.toVm(updatedHub);
    }

    @Override
    public void deactivateHub(String id) {
        Hub hub = hubRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", id));

        if (flightClientService.hasActiveFlightsAtHub(id)) {
            throw new BadRequestException(MessageCode.HUB_HAS_ACTIVE_FLIGHTS);
        }

        if (transactionTemplate != null) {
            transactionTemplate.executeWithoutResult(status -> {
                Hub managed = hubRepository.findById(id).orElse(hub);
                managed.setStatus(HubStatus.INACTIVE);
                hubRepository.save(managed);
            });
        } else {
            hub.setStatus(HubStatus.INACTIVE);
            hubRepository.save(hub);
        }
        log.info("Deactivated Hub with ID: {}", id);
    }

    private void validateAirspaceBounds(Double floor, Double ceiling) {
        double effectiveFloor = floor != null ? floor : 0.0;
        double effectiveCeiling = ceiling != null ? ceiling : 120.0;
        if (effectiveFloor >= effectiveCeiling) {
            throw new BadRequestException(MessageCode.INVALID_AIRSPACE_BOUNDS);
        }
    }
}
