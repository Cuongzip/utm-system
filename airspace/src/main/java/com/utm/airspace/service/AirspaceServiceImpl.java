package com.utm.airspace.service;

import com.utm.airspace.mapper.AirspaceZoneMapper;
import com.utm.airspace.model.AirspaceZone;
import com.utm.airspace.repository.AirspaceZoneRepository;
import com.utm.airspace.viewmodel.AirspaceCheckPathResultVm;
import com.utm.airspace.viewmodel.AirspaceCheckPathVm;
import com.utm.airspace.viewmodel.AirspaceCheckPointVm;
import com.utm.airspace.viewmodel.AirspaceCheckResultVm;
import com.utm.airspace.viewmodel.AirspaceCheckVm;
import com.utm.airspace.viewmodel.AirspacePathConflictVm;
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

    @Override
    @Transactional(readOnly = true)
    public AirspaceCheckResultVm checkPoint(AirspaceCheckVm checkVm) {
        List<AirspaceZone> activeZones = airspaceZoneRepository.findByStatusIgnoreCase("active");
        List<AirspaceZoneVm> violatedZones = new ArrayList<>();
        boolean isAllowed = true;

        for (AirspaceZone zone : activeZones) {
            AirspaceZoneVm zoneVm = airspaceZoneMapper.toVm(zone);
            boolean inside = spatialCalculationService.isPointInZone(
                    checkVm.lat(),
                    checkVm.lon(),
                    checkVm.alt(),
                    zoneVm.geometry(),
                    zone.getFloorAltitudeM(),
                    zone.getCeilingAltitudeM()
            );

            if (inside) {
                violatedZones.add(zoneVm);
                if ("prohibited".equalsIgnoreCase(zone.getType()) || "restricted".equalsIgnoreCase(zone.getType())) {
                    isAllowed = false;
                }
            }
        }

        return new AirspaceCheckResultVm(isAllowed, violatedZones);
    }

    @Override
    @Transactional(readOnly = true)
    public AirspaceCheckPathResultVm checkPath(AirspaceCheckPathVm checkPathVm) {
        List<AirspaceZone> activeZones = airspaceZoneRepository.findByStatusIgnoreCase("active");
        List<AirspacePathConflictVm> violatedZones = new ArrayList<>();

        List<SpatialCalculationService.SampledPoint> sampledPoints =
                spatialCalculationService.samplePolyline(checkPathVm.points(), checkPathVm.spacingM());

        for (SpatialCalculationService.SampledPoint pt : sampledPoints) {
            for (AirspaceZone zone : activeZones) {
                AirspaceZoneVm zoneVm = airspaceZoneMapper.toVm(zone);
                boolean inside = spatialCalculationService.isPointInZone(
                        pt.lat(),
                        pt.lon(),
                        pt.alt(),
                        zoneVm.geometry(),
                        zone.getFloorAltitudeM(),
                        zone.getCeilingAltitudeM()
                );

                if (inside && ("prohibited".equalsIgnoreCase(zone.getType()) || "restricted".equalsIgnoreCase(zone.getType()))) {
                    violatedZones.add(new AirspacePathConflictVm(
                            zone.getId(),
                            zone.getName(),
                            zone.getType(),
                            zone.getFloorAltitudeM(),
                            zone.getCeilingAltitudeM(),
                            new AirspaceCheckPointVm(pt.lat(), pt.lon(), pt.alt()),
                            pt.segmentIndex(),
                            Math.round(pt.distanceFromStartM() * 100.0) / 100.0,
                            String.format("Trajectory point (%.6f, %.6f, %.1fm) intersects %s zone '%s'",
                                    pt.lat(), pt.lon(), pt.alt(), zone.getType(), zone.getName())
                    ));
                }
            }
        }

        boolean isAllowed = violatedZones.isEmpty();
        return new AirspaceCheckPathResultVm(isAllowed, violatedZones);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AirspaceZoneVm> getAllZones(String hubId, String type, String status) {
        return airspaceZoneRepository.findAll(AirspaceZoneRepository.filterBy(hubId, type, status))
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
        if (airspaceZoneRepository.existsByName(postVm.name())) {
            throw new DuplicatedException(MessageCode.AIRSPACE_ZONE_NAME_ALREADY_EXISTED, postVm.name());
        }

        AirspaceZone zone = airspaceZoneMapper.toEntity(postVm);
        AirspaceZone saved = airspaceZoneRepository.saveAndFlush(zone);
        log.info("Created new AirspaceZone with ID: {}", saved.getId());
        return airspaceZoneMapper.toVm(saved);
    }

    @Override
    public AirspaceZoneVm updateZone(String id, AirspaceZonePutVm putVm) {
        AirspaceZone zone = airspaceZoneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.AIRSPACE_ZONE_NOT_FOUND, id));

        if (putVm.name() != null && airspaceZoneRepository.existsByNameAndIdNot(putVm.name(), id)) {
            throw new DuplicatedException(MessageCode.AIRSPACE_ZONE_NAME_ALREADY_EXISTED, putVm.name());
        }

        airspaceZoneMapper.updateEntityFromPutVm(putVm, zone);
        AirspaceZone updated = airspaceZoneRepository.saveAndFlush(zone);
        log.info("Updated AirspaceZone with ID: {}", updated.getId());
        return airspaceZoneMapper.toVm(updated);
    }

    @Override
    public void deleteZone(String id) {
        AirspaceZone zone = airspaceZoneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.AIRSPACE_ZONE_NOT_FOUND, id));
        airspaceZoneRepository.delete(zone);
        log.info("Deleted AirspaceZone with ID: {}", id);
    }
}
