package com.utm.airspace.service;

import com.utm.airspace.mapper.AirspaceZoneMapper;
import com.utm.airspace.model.AirspaceZone;
import com.utm.airspace.model.enumeration.AirspaceZoneStatus;
import com.utm.airspace.model.enumeration.AirspaceZoneType;
import com.utm.airspace.repository.AirspaceZoneRepository;
import com.utm.airspace.service.client.HubClientService;
import com.utm.airspace.viewmodel.check.AirspaceCheckPathResultVm;
import com.utm.airspace.viewmodel.check.AirspaceCheckPathVm;
import com.utm.airspace.viewmodel.check.AirspaceCheckPointVm;
import com.utm.airspace.viewmodel.check.AirspaceCheckResultVm;
import com.utm.airspace.viewmodel.check.AirspaceCheckVm;
import com.utm.airspace.viewmodel.zone.AirspaceZoneListVm;
import com.utm.airspace.viewmodel.zone.AirspaceZonePostVm;
import com.utm.airspace.viewmodel.zone.AirspaceZonePutVm;
import com.utm.airspace.viewmodel.zone.AirspaceZoneVm;
import com.utm.airspace.viewmodel.zone.GeoJsonPolygonVm;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@SuppressWarnings("unchecked")
@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: AirspaceServiceImpl (Based on docs/api/04-airspace.md)")
class AirspaceServiceImplTest {

    @Mock
    private AirspaceZoneRepository airspaceZoneRepository;

    @Mock
    private AirspaceZoneMapper airspaceZoneMapper;

    @Mock
    private SpatialCalculationService spatialCalculationService;

    @Mock
    private HubClientService hubClientService;

    @InjectMocks
    private AirspaceServiceImpl airspaceService;

    private AirspaceZone testZone;
    private AirspaceZoneVm testZoneVm;
    private AirspaceZonePostVm testPostVm;
    private AirspaceZonePutVm testPutVm;
    private GeoJsonPolygonVm testPolygon;

    @BeforeEach
    void setUp() {
        testPolygon = new GeoJsonPolygonVm(
                "Polygon",
                List.of(List.of(
                        List.of(106.69, 10.77),
                        List.of(106.70, 10.77),
                        List.of(106.70, 10.78),
                        List.of(106.69, 10.78),
                        List.of(106.69, 10.77)
                ))
        );

        testZone = AirspaceZone.builder()
                .id("z1b2c3d4-e5f6-7890-abcd-ef1234567890")
                .hubId("h1b2c3d4-e5f6-7890-abcd-ef1234567890")
                .name("Independence Palace No-Fly Zone")
                .zoneType(AirspaceZoneType.NO_FLY_ZONE)
                .altitudeCeiling(120.0)
                .geometry("{\"type\":\"Polygon\",\"coordinates\":[[[106.69,10.77],[106.70,10.77],[106.70,10.78],[106.69,10.78],[106.69,10.77]]]}")
                .status(AirspaceZoneStatus.ACTIVE)
                .description("Critical national security protection zone")
                .build();

        testZoneVm = new AirspaceZoneVm(
                "z1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "Independence Palace No-Fly Zone",
                AirspaceZoneType.NO_FLY_ZONE,
                120.0,
                testPolygon,
                AirspaceZoneStatus.ACTIVE,
                "Critical national security protection zone",
                ZonedDateTime.now(),
                "admin",
                ZonedDateTime.now(),
                "admin"
        );

        testPostVm = new AirspaceZonePostVm(
                "Independence Palace No-Fly Zone",
                "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
                AirspaceZoneType.NO_FLY_ZONE,
                testPolygon,
                120.0,
                AirspaceZoneStatus.ACTIVE,
                "Critical national security protection zone"
        );

        testPutVm = new AirspaceZonePutVm(
                "Independence Palace No-Fly Zone (Expansion)",
                "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
                AirspaceZoneType.NO_FLY_ZONE,
                150.0,
                testPolygon,
                AirspaceZoneStatus.ACTIVE,
                "Expanded security perimeter for summit"
        );
    }

    @Nested
    @DisplayName("Endpoint: POST /api/v1/airspace/check (Point Check)")
    class CheckPointTests {

        @Test
        @DisplayName("Should return safe true when coordinate is outside all active zones")
        void checkPoint_outsideAllZones_returnsSafeTrue() {
            AirspaceCheckVm checkVm = new AirspaceCheckVm(10.7900, 106.7200, 50.0);
            when(airspaceZoneRepository.findByStatus(AirspaceZoneStatus.ACTIVE)).thenReturn(List.of(testZone));
            when(airspaceZoneMapper.toVm(testZone)).thenReturn(testZoneVm);
            when(spatialCalculationService.isPointInPolygon(10.7900, 106.7200, testPolygon)).thenReturn(false);

            AirspaceCheckResultVm result = airspaceService.checkPoint(checkVm);

            assertThat(result).isNotNull();
            assertThat(result.safe()).isTrue();
            assertThat(result.violations()).isEmpty();

            verify(airspaceZoneRepository).findByStatus(AirspaceZoneStatus.ACTIVE);
            verify(spatialCalculationService).isPointInPolygon(10.7900, 106.7200, testPolygon);
        }

        @Test
        @DisplayName("Should return safe false with violation when coordinate falls inside No-Fly Zone")
        void checkPoint_insideNoFlyZone_returnsSafeFalseWithViolation() {
            AirspaceCheckVm checkVm = new AirspaceCheckVm(10.7750, 106.6950, 50.0);
            when(airspaceZoneRepository.findByStatus(AirspaceZoneStatus.ACTIVE)).thenReturn(List.of(testZone));
            when(airspaceZoneMapper.toVm(testZone)).thenReturn(testZoneVm);
            when(spatialCalculationService.isPointInPolygon(10.7750, 106.6950, testPolygon)).thenReturn(true);

            AirspaceCheckResultVm result = airspaceService.checkPoint(checkVm);

            assertThat(result).isNotNull();
            assertThat(result.safe()).isFalse();
            assertThat(result.violations()).hasSize(1);
            assertThat(result.violations().getFirst().zoneId()).isEqualTo("z1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.violations().getFirst().name()).isEqualTo("Independence Palace No-Fly Zone");
            assertThat(result.violations().getFirst().zoneType()).isEqualTo("no_fly_zone");
            assertThat(result.violations().getFirst().reason()).contains("forbidden airspace");
        }

        @Test
        @DisplayName("Should return safe false with violation when coordinate falls inside Restricted Zone")
        void checkPoint_insideRestrictedZone_returnsSafeFalseWithViolation() {
            AirspaceCheckVm checkVm = new AirspaceCheckVm(10.7750, 106.6950, 50.0);
            testZone.setZoneType(AirspaceZoneType.RESTRICTED);
            when(airspaceZoneRepository.findByStatus(AirspaceZoneStatus.ACTIVE)).thenReturn(List.of(testZone));
            when(airspaceZoneMapper.toVm(testZone)).thenReturn(testZoneVm);
            when(spatialCalculationService.isPointInPolygon(10.7750, 106.6950, testPolygon)).thenReturn(true);

            AirspaceCheckResultVm result = airspaceService.checkPoint(checkVm);

            assertThat(result).isNotNull();
            assertThat(result.safe()).isFalse();
            assertThat(result.violations()).hasSize(1);
            assertThat(result.violations().getFirst().zoneId()).isEqualTo("z1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.violations().getFirst().zoneType()).isEqualTo("restricted");
            assertThat(result.violations().getFirst().reason()).contains("restricted airspace");
        }

        @Test
        @DisplayName("Should return safe false when altitude exceeds zone ceiling limit")
        void checkPoint_exceedsAltitudeCeiling_returnsSafeFalseWithCeilingViolation() {
            AirspaceCheckVm checkVm = new AirspaceCheckVm(10.7750, 106.6950, 150.0);
            testZone.setZoneType(AirspaceZoneType.HUB_CORRIDOR);
            when(airspaceZoneRepository.findByStatus(AirspaceZoneStatus.ACTIVE)).thenReturn(List.of(testZone));
            when(airspaceZoneMapper.toVm(testZone)).thenReturn(testZoneVm);
            when(spatialCalculationService.isPointInPolygon(10.7750, 106.6950, testPolygon)).thenReturn(true);

            AirspaceCheckResultVm result = airspaceService.checkPoint(checkVm);

            assertThat(result).isNotNull();
            assertThat(result.safe()).isFalse();
            assertThat(result.violations()).hasSize(1);
            assertThat(result.violations().getFirst().reason()).contains("exceeds ceiling limit");
        }
    }

    @Nested
    @DisplayName("Endpoint: POST /api/v1/airspace/check-path (Path Trajectory Check)")
    class CheckPathTests {

        @Test
        @DisplayName("Should return safe true when flight trajectory does not intersect any active zones")
        void checkPath_clearTrajectory_returnsSafeTrue() {
            AirspaceCheckPointVm pt1 = new AirspaceCheckPointVm(10.750, 106.650, 50.0);
            AirspaceCheckPointVm pt2 = new AirspaceCheckPointVm(10.760, 106.660, 50.0);
            AirspaceCheckPathVm pathVm = new AirspaceCheckPathVm(List.of(pt1, pt2), 200.0);

            SpatialCalculationService.SampledPoint sample1 = new SpatialCalculationService.SampledPoint(10.750, 106.650, 50.0, 0, 0.0);
            when(airspaceZoneRepository.findByStatus(AirspaceZoneStatus.ACTIVE)).thenReturn(List.of(testZone));
            when(spatialCalculationService.samplePolyline(pathVm.points(), 200.0)).thenReturn(List.of(sample1));
            when(airspaceZoneMapper.toVm(testZone)).thenReturn(testZoneVm);
            when(spatialCalculationService.isPointInPolygon(10.750, 106.650, testPolygon)).thenReturn(false);

            AirspaceCheckPathResultVm result = airspaceService.checkPath(pathVm);

            assertThat(result).isNotNull();
            assertThat(result.safe()).isTrue();
            assertThat(result.violations()).isEmpty();
        }

        @Test
        @DisplayName("Should return safe false with conflict details when trajectory intersects No-Fly Zone")
        void checkPath_intersectsNoFlyZone_returnsSafeFalseWithConflicts() {
            AirspaceCheckPointVm pt1 = new AirspaceCheckPointVm(10.770, 106.690, 60.0);
            AirspaceCheckPointVm pt2 = new AirspaceCheckPointVm(10.780, 106.710, 80.0);
            AirspaceCheckPathVm pathVm = new AirspaceCheckPathVm(List.of(pt1, pt2), 200.0);

            SpatialCalculationService.SampledPoint conflictPt = new SpatialCalculationService.SampledPoint(10.775, 106.700, 70.0, 0, 350.0);
            when(airspaceZoneRepository.findByStatus(AirspaceZoneStatus.ACTIVE)).thenReturn(List.of(testZone));
            when(spatialCalculationService.samplePolyline(pathVm.points(), 200.0)).thenReturn(List.of(conflictPt));
            when(airspaceZoneMapper.toVm(testZone)).thenReturn(testZoneVm);
            when(spatialCalculationService.isPointInPolygon(10.775, 106.700, testPolygon)).thenReturn(true);

            AirspaceCheckPathResultVm result = airspaceService.checkPath(pathVm);

            assertThat(result).isNotNull();
            assertThat(result.safe()).isFalse();
            assertThat(result.violations()).hasSize(1);
            assertThat(result.violations().getFirst().zoneId()).isEqualTo("z1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.violations().getFirst().name()).isEqualTo("Independence Palace No-Fly Zone");
            assertThat(result.violations().getFirst().zoneType()).isEqualTo("no_fly_zone");
            assertThat(result.violations().getFirst().altitudeCeiling()).isEqualTo(120.0);
            assertThat(result.violations().getFirst().segmentIndex()).isZero();
            assertThat(result.violations().getFirst().distanceFromStartM()).isEqualTo(350.0);
            assertThat(result.violations().getFirst().conflictPoint().lat()).isEqualTo(10.775);
            assertThat(result.violations().getFirst().conflictPoint().lon()).isEqualTo(106.700);
            assertThat(result.violations().getFirst().conflictPoint().alt()).isEqualTo(70.0);
            assertThat(result.violations().getFirst().reason()).contains("strictly forbidden airspace");
        }
    }

    @Nested
    @DisplayName("Endpoint: GET /api/v1/airspace/zones (List Zones)")
    class GetAllZonesTests {

        @Test
        @DisplayName("Should return paginated AirspaceZoneListVm when query parameters are valid")
        void getAllZones_withFilterAndPagination_returnsListVm() {
            Page<AirspaceZone> mockPage = new PageImpl<>(List.of(testZone));
            when(airspaceZoneRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(mockPage);
            when(airspaceZoneMapper.toVm(testZone)).thenReturn(testZoneVm);

            AirspaceZoneListVm result = airspaceService.getAllZones(
                    "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    "no_fly_zone",
                    "active",
                    20,
                    0
            );

            assertThat(result).isNotNull();
            assertThat(result.total()).isEqualTo(1L);
            assertThat(result.items()).hasSize(1);
            assertThat(result.items().getFirst().id()).isEqualTo("z1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.items().getFirst().name()).isEqualTo("Independence Palace No-Fly Zone");
            assertThat(result.items().getFirst().zoneType()).isEqualTo(AirspaceZoneType.NO_FLY_ZONE);
            assertThat(result.items().getFirst().altitudeCeiling()).isEqualTo(120.0);
            assertThat(result.items().getFirst().status()).isEqualTo(AirspaceZoneStatus.ACTIVE);

            verify(airspaceZoneRepository).findAll(any(Specification.class), any(Pageable.class));
            verify(airspaceZoneMapper).toVm(testZone);
        }

        @Test
        @DisplayName("Should return empty list when no airspace zones match filter criteria")
        void getAllZones_noMatch_returnsEmptyListVm() {
            Page<AirspaceZone> emptyPage = new PageImpl<>(List.of());
            when(airspaceZoneRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(emptyPage);

            AirspaceZoneListVm result = airspaceService.getAllZones(null, "warning", "active", 10, 0);

            assertThat(result).isNotNull();
            assertThat(result.total()).isZero();
            assertThat(result.items()).isEmpty();
        }

        @Test
        @DisplayName("Should return unpaged list when limit is less than or equal to zero")
        void getAllZones_limitLessThanOrEqualToZero_returnsAllUnpaged() {
            when(airspaceZoneRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(testZone));
            when(airspaceZoneMapper.toVm(testZone)).thenReturn(testZoneVm);

            AirspaceZoneListVm result = airspaceService.getAllZones(null, null, null, 0, 0);

            assertThat(result).isNotNull();
            assertThat(result.total()).isEqualTo(1L);
            assertThat(result.items()).hasSize(1);
            assertThat(result.items().getFirst().name()).isEqualTo("Independence Palace No-Fly Zone");

            verify(airspaceZoneRepository).findAll(any(Specification.class), any(Sort.class));
        }
    }

    @Nested
    @DisplayName("Endpoint: GET /api/v1/airspace/zones/{id} (Get Zone by ID)")
    class GetZoneByIdTests {

        @Test
        @DisplayName("Should return AirspaceZoneVm when zone ID exists")
        void getZoneById_existingId_returnsZoneVm() {
            when(airspaceZoneRepository.findById("z1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(Optional.of(testZone));
            when(airspaceZoneMapper.toVm(testZone)).thenReturn(testZoneVm);

            AirspaceZoneVm result = airspaceService.getZoneById("z1b2c3d4-e5f6-7890-abcd-ef1234567890");

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo("z1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.hubId()).isEqualTo("h1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.name()).isEqualTo("Independence Palace No-Fly Zone");
            assertThat(result.zoneType()).isEqualTo(AirspaceZoneType.NO_FLY_ZONE);
            assertThat(result.altitudeCeiling()).isEqualTo(120.0);
            assertThat(result.status()).isEqualTo(AirspaceZoneStatus.ACTIVE);
            assertThat(result.description()).isEqualTo("Critical national security protection zone");

            verify(airspaceZoneRepository).findById("z1b2c3d4-e5f6-7890-abcd-ef1234567890");
            verify(airspaceZoneMapper).toVm(testZone);
        }

        @Test
        @DisplayName("Should throw NotFoundException (404) when zone ID does not exist")
        void getZoneById_nonExistentId_throwsNotFoundException() {
            when(airspaceZoneRepository.findById("non-existent-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> airspaceService.getZoneById("non-existent-id"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("non-existent-id");

            verify(airspaceZoneRepository).findById("non-existent-id");
            verify(airspaceZoneMapper, never()).toVm(any());
        }
    }

    @Nested
    @DisplayName("Endpoint: POST /api/v1/airspace/zones (Create Zone)")
    class CreateZoneTests {

        @Test
        @DisplayName("Should successfully create zone and return 201 Created ViewModel when input is valid")
        void createZone_validInput_savesAndReturnsCreatedVm() {
            when(airspaceZoneRepository.existsByName("Independence Palace No-Fly Zone")).thenReturn(false);
            when(hubClientService.existsById("h1b2c3d4-e5f6-7890-abcd-ef1234567890")).thenReturn(true);
            doNothing().when(spatialCalculationService).validatePolygon(testPolygon);
            when(airspaceZoneMapper.toEntity(testPostVm)).thenReturn(testZone);
            when(airspaceZoneRepository.saveAndFlush(any(AirspaceZone.class))).thenReturn(testZone);
            when(airspaceZoneMapper.toVm(testZone)).thenReturn(testZoneVm);

            AirspaceZoneVm result = airspaceService.createZone(testPostVm);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo("z1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.name()).isEqualTo("Independence Palace No-Fly Zone");
            assertThat(result.hubId()).isEqualTo("h1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.zoneType()).isEqualTo(AirspaceZoneType.NO_FLY_ZONE);
            assertThat(result.altitudeCeiling()).isEqualTo(120.0);
            assertThat(result.status()).isEqualTo(AirspaceZoneStatus.ACTIVE);

            verify(airspaceZoneRepository).existsByName("Independence Palace No-Fly Zone");
            verify(hubClientService).existsById("h1b2c3d4-e5f6-7890-abcd-ef1234567890");
            verify(spatialCalculationService).validatePolygon(testPolygon);
            verify(airspaceZoneRepository).saveAndFlush(testZone);
        }

        @Test
        @DisplayName("Should throw DuplicatedException (409 Conflict) when zone name already exists")
        void createZone_duplicateName_throwsDuplicatedException() {
            when(airspaceZoneRepository.existsByName("Independence Palace No-Fly Zone")).thenReturn(true);

            assertThatThrownBy(() -> airspaceService.createZone(testPostVm))
                    .isInstanceOf(DuplicatedException.class)
                    .hasMessageContaining("Independence Palace No-Fly Zone");

            verify(airspaceZoneRepository).existsByName("Independence Palace No-Fly Zone");
            verify(airspaceZoneRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("Should throw NotFoundException (404) when associated hubId does not exist in hub service")
        void createZone_nonExistentHubId_throwsNotFoundException() {
            when(airspaceZoneRepository.existsByName("Independence Palace No-Fly Zone")).thenReturn(false);
            when(hubClientService.existsById("h1b2c3d4-e5f6-7890-abcd-ef1234567890")).thenReturn(false);

            assertThatThrownBy(() -> airspaceService.createZone(testPostVm))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("h1b2c3d4-e5f6-7890-abcd-ef1234567890");

            verify(hubClientService).existsById("h1b2c3d4-e5f6-7890-abcd-ef1234567890");
            verify(airspaceZoneRepository, never()).saveAndFlush(any());
        }
    }

    @Nested
    @DisplayName("Endpoint: PUT /api/v1/airspace/zones/{id} (Update Zone)")
    class UpdateZoneTests {

        @Test
        @DisplayName("Should update allowed mutable fields and return updated AirspaceZoneVm")
        void updateZone_existingIdAndValidInput_updatesAndReturnsVm() {
            AirspaceZone updatedZone = AirspaceZone.builder()
                    .id("z1b2c3d4-e5f6-7890-abcd-ef1234567890")
                    .hubId("h1b2c3d4-e5f6-7890-abcd-ef1234567890")
                    .name("Independence Palace No-Fly Zone (Expansion)")
                    .zoneType(AirspaceZoneType.NO_FLY_ZONE)
                    .altitudeCeiling(150.0)
                    .geometry("{\"type\":\"Polygon\",\"coordinates\":[[[106.69,10.77],[106.70,10.77],[106.70,10.78],[106.69,10.78],[106.69,10.77]]]}")
                    .status(AirspaceZoneStatus.ACTIVE)
                    .description("Expanded security perimeter for summit")
                    .build();

            AirspaceZoneVm updatedVm = new AirspaceZoneVm(
                    "z1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    "Independence Palace No-Fly Zone (Expansion)",
                    AirspaceZoneType.NO_FLY_ZONE,
                    150.0,
                    testPolygon,
                    AirspaceZoneStatus.ACTIVE,
                    "Expanded security perimeter for summit",
                    ZonedDateTime.now(),
                    "admin",
                    ZonedDateTime.now(),
                    "admin"
            );

            when(airspaceZoneRepository.findById("z1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(Optional.of(testZone));
            when(airspaceZoneRepository.existsByNameAndIdNot("Independence Palace No-Fly Zone (Expansion)", "z1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(false);
            when(hubClientService.existsById("h1b2c3d4-e5f6-7890-abcd-ef1234567890")).thenReturn(true);
            doNothing().when(spatialCalculationService).validatePolygon(testPolygon);

            doAnswer(invocation -> {
                testZone.setName(testPutVm.name());
                testZone.setAltitudeCeiling(testPutVm.altitudeCeiling());
                return null;
            }).when(airspaceZoneMapper).updateEntityFromPutVm(testPutVm, testZone);

            when(airspaceZoneRepository.saveAndFlush(testZone)).thenReturn(updatedZone);
            when(airspaceZoneMapper.toVm(updatedZone)).thenReturn(updatedVm);

            AirspaceZoneVm result = airspaceService.updateZone("z1b2c3d4-e5f6-7890-abcd-ef1234567890", testPutVm);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo("z1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.name()).isEqualTo("Independence Palace No-Fly Zone (Expansion)");
            assertThat(result.altitudeCeiling()).isEqualTo(150.0);
            assertThat(result.status()).isEqualTo(AirspaceZoneStatus.ACTIVE);

            verify(airspaceZoneRepository).findById("z1b2c3d4-e5f6-7890-abcd-ef1234567890");
            verify(hubClientService).existsById("h1b2c3d4-e5f6-7890-abcd-ef1234567890");
            verify(spatialCalculationService).validatePolygon(testPolygon);
            verify(airspaceZoneRepository).saveAndFlush(testZone);
        }

        @Test
        @DisplayName("Should throw DuplicatedException (409) when updating to an existing zone name")
        void updateZone_duplicateName_throwsDuplicatedException() {
            when(airspaceZoneRepository.findById("z1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(Optional.of(testZone));
            when(airspaceZoneRepository.existsByNameAndIdNot("Independence Palace No-Fly Zone (Expansion)", "z1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(true);

            assertThatThrownBy(() -> airspaceService.updateZone("z1b2c3d4-e5f6-7890-abcd-ef1234567890", testPutVm))
                    .isInstanceOf(DuplicatedException.class)
                    .hasMessageContaining("Independence Palace No-Fly Zone (Expansion)");

            verify(airspaceZoneRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("Should throw NotFoundException (404) when updating with non-existent hubId")
        void updateZone_nonExistentHubId_throwsNotFoundException() {
            when(airspaceZoneRepository.findById("z1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(Optional.of(testZone));
            when(airspaceZoneRepository.existsByNameAndIdNot(any(), eq("z1b2c3d4-e5f6-7890-abcd-ef1234567890")))
                    .thenReturn(false);
            when(hubClientService.existsById("h1b2c3d4-e5f6-7890-abcd-ef1234567890")).thenReturn(false);

            assertThatThrownBy(() -> airspaceService.updateZone("z1b2c3d4-e5f6-7890-abcd-ef1234567890", testPutVm))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("h1b2c3d4-e5f6-7890-abcd-ef1234567890");

            verify(airspaceZoneRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("Should throw NotFoundException (404) when updating non-existent zone ID")
        void updateZone_nonExistentId_throwsNotFoundException() {
            when(airspaceZoneRepository.findById("non-existent-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> airspaceService.updateZone("non-existent-id", testPutVm))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("non-existent-id");

            verify(airspaceZoneRepository).findById("non-existent-id");
            verify(airspaceZoneRepository, never()).saveAndFlush(any());
        }
    }

    @Nested
    @DisplayName("Endpoint: DELETE /api/v1/airspace/zones/{id} (Deactivate Zone)")
    class DeleteZoneTests {

        @Test
        @DisplayName("Should successfully deactivate zone by setting status to INACTIVE")
        void deleteZone_validId_setsStatusInactiveAndSaves() {
            when(airspaceZoneRepository.findById("z1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(Optional.of(testZone));
            when(airspaceZoneRepository.save(any(AirspaceZone.class))).thenReturn(testZone);

            airspaceService.deleteZone("z1b2c3d4-e5f6-7890-abcd-ef1234567890");

            assertThat(testZone.getStatus()).isEqualTo(AirspaceZoneStatus.INACTIVE);

            verify(airspaceZoneRepository).findById("z1b2c3d4-e5f6-7890-abcd-ef1234567890");
            verify(airspaceZoneRepository).save(testZone);
        }

        @Test
        @DisplayName("Should throw NotFoundException (404) when deleting non-existent zone ID")
        void deleteZone_nonExistentId_throwsNotFoundException() {
            when(airspaceZoneRepository.findById("non-existent-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> airspaceService.deleteZone("non-existent-id"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("non-existent-id");

            verify(airspaceZoneRepository).findById("non-existent-id");
            verify(airspaceZoneRepository, never()).save(any());
        }
    }
}
