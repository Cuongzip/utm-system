package com.utm.airspace.service;

import com.utm.airspace.mapper.AirspaceZoneMapper;
import com.utm.airspace.model.AirspaceZone;
import com.utm.airspace.model.enumeration.AirspaceZoneStatus;
import com.utm.airspace.model.enumeration.AirspaceZoneType;
import com.utm.airspace.repository.AirspaceZoneRepository;
import com.utm.airspace.viewmodel.AirspaceCheckPathResultVm;
import com.utm.airspace.viewmodel.AirspaceCheckPathVm;
import com.utm.airspace.viewmodel.AirspaceCheckPointVm;
import com.utm.airspace.viewmodel.AirspaceCheckResultVm;
import com.utm.airspace.viewmodel.AirspaceCheckVm;
import com.utm.airspace.viewmodel.AirspacePathConflictVm;
import com.utm.airspace.viewmodel.AirspaceViolationVm;
import com.utm.airspace.viewmodel.AirspaceZonePostVm;
import com.utm.airspace.viewmodel.AirspaceZonePutVm;
import com.utm.airspace.viewmodel.AirspaceZoneVm;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AirspaceServiceImpl implements AirspaceService {

    private final AirspaceZoneRepository airspaceZoneRepository;
    private final AirspaceZoneMapper airspaceZoneMapper;
    private final SpatialCalculationService spatialCalculationService;
    private final HubClientService hubClientService;

    @Override
    @Transactional(readOnly = true)
    public AirspaceCheckResultVm checkPoint(AirspaceCheckVm checkVm) {
        List<AirspaceZone> activeZones = airspaceZoneRepository.findByStatus(AirspaceZoneStatus.ACTIVE);
        List<AirspaceViolationVm> violations = new ArrayList<>();
        boolean safe = true;

        for (AirspaceZone zone : activeZones) {
            AirspaceZoneVm zoneVm = airspaceZoneMapper.toVm(zone);
            boolean inside = spatialCalculationService.isPointInPolygon(
                    checkVm.lat(),
                    checkVm.lon(),
                    zoneVm.geometry()
            );

            if (inside) {
                if (zone.getZoneType() == AirspaceZoneType.NO_FLY_ZONE) {
                    safe = false;
                    violations.add(new AirspaceViolationVm(
                            zone.getId(),
                            zone.getName(),
                            zone.getZoneType().getValue(),
                            "Point falls inside strictly forbidden airspace"
                    ));
                } else if (zone.getZoneType() == AirspaceZoneType.RESTRICTED) {
                    safe = false;
                    violations.add(new AirspaceViolationVm(
                            zone.getId(),
                            zone.getName(),
                            zone.getZoneType().getValue(),
                            "Point falls inside restricted airspace requiring special ATC clearance"
                    ));
                } else if (checkVm.alt() != null && checkVm.alt() > zone.getAltitudeCeiling()) {
                    safe = false;
                    violations.add(new AirspaceViolationVm(
                            zone.getId(),
                            zone.getName(),
                            zone.getZoneType().getValue(),
                            String.format("Point altitude (%.1fm) exceeds ceiling limit (%.1fm) of zone '%s'",
                                    checkVm.alt(), zone.getAltitudeCeiling(), zone.getName())
                    ));
                }
            }
        }

        return new AirspaceCheckResultVm(safe, violations);
    }

    @Override
    @Transactional(readOnly = true)
    public AirspaceCheckPathResultVm checkPath(AirspaceCheckPathVm checkPathVm) {
        List<AirspaceZone> activeZones = airspaceZoneRepository.findByStatus(AirspaceZoneStatus.ACTIVE);
        List<AirspacePathConflictVm> violations = new ArrayList<>();

        List<SpatialCalculationService.SampledPoint> sampledPoints =
                spatialCalculationService.samplePolyline(checkPathVm.points(), checkPathVm.spacingM());

        for (SpatialCalculationService.SampledPoint pt : sampledPoints) {
            for (AirspaceZone zone : activeZones) {
                AirspaceZoneVm zoneVm = airspaceZoneMapper.toVm(zone);
                boolean inside = spatialCalculationService.isPointInPolygon(
                        pt.lat(),
                        pt.lon(),
                        zoneVm.geometry()
                );

                if (inside) {
                    if (zone.getZoneType() == AirspaceZoneType.NO_FLY_ZONE) {
                        violations.add(new AirspacePathConflictVm(
                                zone.getId(),
                                zone.getName(),
                                zone.getZoneType().getValue(),
                                zone.getAltitudeCeiling(),
                                new AirspaceCheckPointVm(pt.lat(), pt.lon(), pt.alt()),
                                pt.segmentIndex(),
                                Math.round(pt.distanceFromStartM() * 100.0) / 100.0,
                                String.format("Trajectory intersects strictly forbidden airspace '%s'", zone.getName())
                        ));
                    } else if (zone.getZoneType() == AirspaceZoneType.RESTRICTED) {
                        violations.add(new AirspacePathConflictVm(
                                zone.getId(),
                                zone.getName(),
                                zone.getZoneType().getValue(),
                                zone.getAltitudeCeiling(),
                                new AirspaceCheckPointVm(pt.lat(), pt.lon(), pt.alt()),
                                pt.segmentIndex(),
                                Math.round(pt.distanceFromStartM() * 100.0) / 100.0,
                                String.format("Trajectory intersects restricted zone '%s'", zone.getName())
                        ));
                    } else if (pt.alt() > zone.getAltitudeCeiling()) {
                        violations.add(new AirspacePathConflictVm(
                                zone.getId(),
                                zone.getName(),
                                zone.getZoneType().getValue(),
                                zone.getAltitudeCeiling(),
                                new AirspaceCheckPointVm(pt.lat(), pt.lon(), pt.alt()),
                                pt.segmentIndex(),
                                Math.round(pt.distanceFromStartM() * 100.0) / 100.0,
                                String.format("Trajectory altitude (%.1fm) exceeds ceiling limit (%.1fm) in zone '%s'",
                                        pt.alt(), zone.getAltitudeCeiling(), zone.getName())
                        ));
                    }
                }
            }
        }

        boolean safe = violations.isEmpty();
        return new AirspaceCheckPathResultVm(safe, violations);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AirspaceZoneVm> getAllZones(String hubId, String zoneType, String status) {
        return airspaceZoneRepository.findAll(AirspaceZoneRepository.filterBy(hubId, zoneType, status))
                .stream()
                .map(airspaceZoneMapper::toVm)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AirspaceZoneVm getZoneById(String id) {
        AirspaceZone zone = airspaceZoneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.AIRSPACE_ZONE_NOT_FOUND, id));
        return airspaceZoneMapper.toVm(zone);
    }

    @Override
    public AirspaceZoneVm createZone(AirspaceZonePostVm postVm) {
        String trimmedName = postVm.name().trim();
        if (airspaceZoneRepository.existsByName(trimmedName)) {
            throw new DuplicatedException(MessageCode.AIRSPACE_ZONE_NAME_ALREADY_EXISTED, trimmedName);
        }

        if (postVm.hubId() != null && !postVm.hubId().isBlank()) {
            if (!hubClientService.existsById(postVm.hubId().trim())) {
                throw new NotFoundException(MessageCode.HUB_NOT_FOUND, postVm.hubId());
            }
        }

        spatialCalculationService.validatePolygon(postVm.geometry());

        AirspaceZone zone = airspaceZoneMapper.toEntity(postVm);
        zone.setName(trimmedName);
        AirspaceZone saved = airspaceZoneRepository.saveAndFlush(zone);
        log.info("Created new AirspaceZone with ID: {} and name: {}", saved.getId(), saved.getName());
        return airspaceZoneMapper.toVm(saved);
    }

    @Override
    public AirspaceZoneVm updateZone(String id, AirspaceZonePutVm putVm) {
        AirspaceZone zone = airspaceZoneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.AIRSPACE_ZONE_NOT_FOUND, id));

        if (putVm.name() != null) {
            String trimmedName = putVm.name().trim();
            if (airspaceZoneRepository.existsByNameAndIdNot(trimmedName, id)) {
                throw new DuplicatedException(MessageCode.AIRSPACE_ZONE_NAME_ALREADY_EXISTED, trimmedName);
            }
        }

        if (putVm.hubId() != null && !putVm.hubId().isBlank()) {
            if (!hubClientService.existsById(putVm.hubId().trim())) {
                throw new NotFoundException(MessageCode.HUB_NOT_FOUND, putVm.hubId());
            }
        }

        if (putVm.geometry() != null) {
            spatialCalculationService.validatePolygon(putVm.geometry());
        }

        airspaceZoneMapper.updateEntityFromPutVm(putVm, zone);
        if (putVm.name() != null) {
            zone.setName(putVm.name().trim());
        }
        AirspaceZone updated = airspaceZoneRepository.saveAndFlush(zone);
        log.info("Updated AirspaceZone with ID: {}", updated.getId());
        return airspaceZoneMapper.toVm(updated);
    }

    @Override
    public void deleteZone(String id) {
        AirspaceZone zone = airspaceZoneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.AIRSPACE_ZONE_NOT_FOUND, id));
        zone.setStatus(AirspaceZoneStatus.INACTIVE);
        airspaceZoneRepository.save(zone);
        log.info("Soft deleted (deactivated) AirspaceZone with ID: {}", id);
    }
}
