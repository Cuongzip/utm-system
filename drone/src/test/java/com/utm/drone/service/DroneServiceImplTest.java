package com.utm.drone.service;

import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.drone.mapper.DroneMapper;
import com.utm.drone.model.Drone;
import com.utm.drone.model.enumeration.DroneStatus;
import com.utm.drone.repository.DroneRepository;
import com.utm.drone.service.client.HubClientService;
import com.utm.drone.service.client.OrganizationClientService;
import com.utm.drone.viewmodel.client.HubBriefVm;
import com.utm.drone.viewmodel.client.OrganizationBriefVm;
import com.utm.drone.viewmodel.drone.DroneListVm;
import com.utm.drone.viewmodel.drone.DronePostVm;
import com.utm.drone.viewmodel.drone.DronePutVm;
import com.utm.drone.viewmodel.drone.DroneVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
@DisplayName("Unit Tests: DroneServiceImpl (Specification-Driven)")
class DroneServiceImplTest {

        @Mock
        private DroneRepository droneRepository;

        @Mock
        private DroneMapper droneMapper;

        @Mock
        private HubClientService hubClientService;

        @Mock
        private OrganizationClientService organizationClientService;

        @InjectMocks
        private DroneServiceImpl droneService;

        private Drone sampleDrone;
        private DroneVm sampleDroneVm;
        private Drone unassignedDrone;
        private DroneVm unassignedDroneVm;
        private OrganizationBriefVm sampleOwner;
        private HubBriefVm sampleHub;
        private DronePostVm samplePostVm;
        private DronePutVm samplePutVm;

        @BeforeEach
        void setUp() {
                sampleDrone = Drone.builder()
                                .id("d1b2c3d4-e5f6-7890-abcd-ef1234567890")
                                .registrationNumber("VN-UAV-001")
                                .manufacturer("DJI")
                                .model("Matrice 350 RTK")
                                .ownerId("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
                                .homeHubId("h1b2c3d4-e5f6-7890-abcd-ef1234567890")
                                .batteryCapacityWh(588.0)
                                .maxPayload(2.7)
                                .status(DroneStatus.AVAILABLE)
                                .build();

                sampleOwner = new OrganizationBriefVm(
                                "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "Drone Express Global Corp",
                                "GP-2026-DK01",
                                "operator");

                sampleHub = new HubBriefVm(
                                "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "HUB-SGN-01",
                                "Central Vertiport Hub D1");

                sampleDroneVm = new DroneVm(
                                "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "VN-UAV-001",
                                "DJI",
                                "Matrice 350 RTK",
                                "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                588.0,
                                2.7,
                                DroneStatus.AVAILABLE,
                                sampleOwner,
                                sampleHub,
                                null,
                                null,
                                "system",
                                null,
                                null);

                unassignedDrone = Drone.builder()
                                .id("d2b2c3d4-e5f6-7890-abcd-ef1234567890")
                                .registrationNumber("VN-UAV-002")
                                .manufacturer("Autel")
                                .model("EVO Max 4T")
                                .ownerId(null)
                                .homeHubId(null)
                                .batteryCapacityWh(450.0)
                                .maxPayload(1.5)
                                .status(DroneStatus.AVAILABLE)
                                .build();

                unassignedDroneVm = new DroneVm(
                                "d2b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "VN-UAV-002",
                                "Autel",
                                "EVO Max 4T",
                                null,
                                null,
                                450.0,
                                1.5,
                                DroneStatus.AVAILABLE,
                                null,
                                null,
                                null,
                                null,
                                "system",
                                null,
                                null);

                samplePostVm = new DronePostVm(
                                "VN-UAV-001",
                                "DJI",
                                "Matrice 350 RTK",
                                "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                588.0,
                                2.7);

                samplePutVm = new DronePutVm(
                                "h2b2c3d4-e5f6-7890-abcd-ef1234567890",
                                620.0,
                                3.2,
                                DroneStatus.MAINTENANCE);
        }

        @Test
        @DisplayName("getDrones returns paged list when filters match")
        void getDrones_pagedWithFilters_returnsMatchingList() {
                Page<Drone> page = new PageImpl<>(List.of(sampleDrone));
                when(droneRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
                when(droneMapper.toVm(sampleDrone, null, null, null)).thenReturn(sampleDroneVm);

                DroneListVm result = droneService.getDrones(DroneStatus.AVAILABLE,
                                "h1b2c3d4-e5f6-7890-abcd-ef1234567890", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "DJI",
                                10, 0);

                assertThat(result).isNotNull();
                assertThat(result.total()).isEqualTo(1);
                assertThat(result.items()).hasSize(1);
                DroneVm item = result.items().get(0);
                assertThat(item.id()).isEqualTo("d1b2c3d4-e5f6-7890-abcd-ef1234567890");
                assertThat(item.registrationNumber()).isEqualTo("VN-UAV-001");
                assertThat(item.manufacturer()).isEqualTo("DJI");
                assertThat(item.model()).isEqualTo("Matrice 350 RTK");
                assertThat(item.status()).isEqualTo(DroneStatus.AVAILABLE);
        }

        @Test
        @DisplayName("getDrones returns unpaged list when limit is less than or equal to zero")
        void getDrones_limitZeroOrNegative_returnsAllUnpaged() {
                when(droneRepository.findAll(any(Specification.class), any(Sort.class)))
                                .thenReturn(List.of(sampleDrone, unassignedDrone));
                when(droneMapper.toVm(sampleDrone, null, null, null)).thenReturn(sampleDroneVm);
                when(droneMapper.toVm(unassignedDrone, null, null, null)).thenReturn(unassignedDroneVm);

                DroneListVm result = droneService.getDrones(null, null, null, null, 0, 0);

                assertThat(result).isNotNull();
                assertThat(result.total()).isEqualTo(2);
                assertThat(result.items()).hasSize(2);
                assertThat(result.items().get(0).registrationNumber()).isEqualTo("VN-UAV-001");
                assertThat(result.items().get(1).registrationNumber()).isEqualTo("VN-UAV-002");
        }

        @Test
        @DisplayName("getDroneById returns enriched ViewModel when drone has owner and hub")
        void getDroneById_existingIdWithEnrichedData_returnsEnrichedVm() {
                when(droneRepository.findById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleDrone));
                when(organizationClientService.getOrganizationById("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleOwner));
                when(hubClientService.getHubById("h1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleHub));
                when(droneMapper.toVm(sampleDrone, sampleOwner, sampleHub, null)).thenReturn(sampleDroneVm);

                DroneVm result = droneService.getDroneById("d1b2c3d4-e5f6-7890-abcd-ef1234567890");

                assertThat(result).isNotNull();
                assertThat(result.id()).isEqualTo("d1b2c3d4-e5f6-7890-abcd-ef1234567890");
                assertThat(result.registrationNumber()).isEqualTo("VN-UAV-001");
                assertThat(result.manufacturer()).isEqualTo("DJI");
                assertThat(result.model()).isEqualTo("Matrice 350 RTK");
                assertThat(result.batteryCapacityWh()).isEqualTo(588.0);
                assertThat(result.maxPayload()).isEqualTo(2.7);
                assertThat(result.status()).isEqualTo(DroneStatus.AVAILABLE);
                assertThat(result.owner()).isNotNull();
                assertThat(result.owner().name()).isEqualTo("Drone Express Global Corp");
                assertThat(result.homeHub()).isNotNull();
                assertThat(result.homeHub().code()).isEqualTo("HUB-SGN-01");
        }

        @Test
        @DisplayName("getDroneById returns ViewModel with null owner and hub when foreign keys are empty")
        void getDroneById_existingIdWithoutExternalLinks_returnsVmWithoutEnrichments() {
                when(droneRepository.findById("d2b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(unassignedDrone));
                when(droneMapper.toVm(unassignedDrone, null, null, null)).thenReturn(unassignedDroneVm);

                DroneVm result = droneService.getDroneById("d2b2c3d4-e5f6-7890-abcd-ef1234567890");

                assertThat(result).isNotNull();
                assertThat(result.owner()).isNull();
                assertThat(result.homeHub()).isNull();
                verify(organizationClientService, never()).getOrganizationById(any());
                verify(hubClientService, never()).getHubById(any());
        }

        @Test
        @DisplayName("getDroneById throws NotFoundException when drone ID does not exist")
        void getDroneById_nonExistentId_throwsNotFoundException() {
                when(droneRepository.findById("unknown-id")).thenReturn(Optional.empty());

                assertThatThrownBy(() -> droneService.getDroneById("unknown-id"))
                                .isInstanceOf(NotFoundException.class)
                                .hasMessageContaining("unknown-id");
        }

        @Test
        @DisplayName("createDrone creates drone and returns enriched ViewModel when input is valid")
        void createDrone_validInput_createsAndReturnsEnrichedDrone() {
                when(droneRepository.existsByRegistrationNumber("VN-UAV-001")).thenReturn(false);
                when(organizationClientService.checkOrganizationExists("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(true);
                when(hubClientService.checkHubExists("h1b2c3d4-e5f6-7890-abcd-ef1234567890")).thenReturn(true);
                when(droneMapper.toEntity(samplePostVm)).thenReturn(sampleDrone);
                when(droneRepository.saveAndFlush(sampleDrone)).thenReturn(sampleDrone);

                when(droneRepository.findById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleDrone));
                when(organizationClientService.getOrganizationById("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleOwner));
                when(hubClientService.getHubById("h1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleHub));
                when(droneMapper.toVm(sampleDrone, sampleOwner, sampleHub, null)).thenReturn(sampleDroneVm);

                DroneVm result = droneService.createDrone(samplePostVm);

                assertThat(result).isNotNull();
                assertThat(result.id()).isEqualTo("d1b2c3d4-e5f6-7890-abcd-ef1234567890");
                assertThat(result.registrationNumber()).isEqualTo("VN-UAV-001");
                assertThat(result.status()).isEqualTo(DroneStatus.AVAILABLE);
                verify(droneRepository).saveAndFlush(sampleDrone);
        }

        @Test
        @DisplayName("createDrone auto-generates registration number when omitted or blank")
        void createDrone_nullOrBlankRegistrationNumber_autoGeneratesRegistrationNumber() {
                DronePostVm postVmWithoutRegNumber = new DronePostVm(
                                null,
                                "DJI",
                                "Matrice 350 RTK",
                                "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                588.0,
                                2.7);

                when(droneRepository.existsByRegistrationNumber(anyString())).thenReturn(false);
                when(organizationClientService.checkOrganizationExists("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(true);
                when(hubClientService.checkHubExists("h1b2c3d4-e5f6-7890-abcd-ef1234567890")).thenReturn(true);

                Drone droneToSave = Drone.builder()
                                .id("d1b2c3d4-e5f6-7890-abcd-ef1234567890")
                                .manufacturer("DJI")
                                .model("Matrice 350 RTK")
                                .ownerId("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
                                .homeHubId("h1b2c3d4-e5f6-7890-abcd-ef1234567890")
                                .batteryCapacityWh(588.0)
                                .maxPayload(2.7)
                                .status(DroneStatus.AVAILABLE)
                                .build();
                when(droneMapper.toEntity(postVmWithoutRegNumber)).thenReturn(droneToSave);
                when(droneRepository.saveAndFlush(any(Drone.class))).thenAnswer(invocation -> invocation.getArgument(0));

                when(droneRepository.findById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(droneToSave));
                when(organizationClientService.getOrganizationById("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleOwner));
                when(hubClientService.getHubById("h1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleHub));
                when(droneMapper.toVm(eq(droneToSave), eq(sampleOwner), eq(sampleHub), isNull()))
                                .thenAnswer(inv -> new DroneVm(
                                                droneToSave.getId(),
                                                droneToSave.getRegistrationNumber(),
                                                droneToSave.getManufacturer(),
                                                droneToSave.getModel(),
                                                droneToSave.getOwnerId(),
                                                droneToSave.getHomeHubId(),
                                                droneToSave.getBatteryCapacityWh(),
                                                droneToSave.getMaxPayload(),
                                                droneToSave.getStatus(),
                                                sampleOwner,
                                                sampleHub,
                                                null,
                                                null,
                                                "system",
                                                null,
                                                null));

                DroneVm result = droneService.createDrone(postVmWithoutRegNumber);

                assertThat(result).isNotNull();
                assertThat(result.registrationNumber()).startsWith("DRN-");
                assertThat(droneToSave.getRegistrationNumber()).startsWith("DRN-");
                verify(droneRepository).saveAndFlush(droneToSave);
        }

        @Test
        @DisplayName("createDrone throws DuplicatedException when registration number already exists")
        void createDrone_duplicateRegistrationNumber_throwsDuplicatedException() {
                when(droneRepository.existsByRegistrationNumber("VN-UAV-001")).thenReturn(true);

                assertThatThrownBy(() -> droneService.createDrone(samplePostVm))
                                .isInstanceOf(DuplicatedException.class)
                                .hasMessageContaining("VN-UAV-001");

                verify(droneRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("createDrone throws NotFoundException when owner organization does not exist")
        void createDrone_nonExistentOwner_throwsNotFoundException() {
                when(droneRepository.existsByRegistrationNumber("VN-UAV-001")).thenReturn(false);
                when(organizationClientService.checkOrganizationExists("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(false);

                assertThatThrownBy(() -> droneService.createDrone(samplePostVm))
                                .isInstanceOf(NotFoundException.class)
                                .hasMessageContaining("a1b2c3d4-e5f6-7890-abcd-ef1234567890");

                verify(droneRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("createDrone throws NotFoundException when home hub does not exist")
        void createDrone_nonExistentHomeHub_throwsNotFoundException() {
                when(droneRepository.existsByRegistrationNumber("VN-UAV-001")).thenReturn(false);
                when(organizationClientService.checkOrganizationExists("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(true);
                when(hubClientService.checkHubExists("h1b2c3d4-e5f6-7890-abcd-ef1234567890")).thenReturn(false);

                assertThatThrownBy(() -> droneService.createDrone(samplePostVm))
                                .isInstanceOf(NotFoundException.class)
                                .hasMessageContaining("h1b2c3d4-e5f6-7890-abcd-ef1234567890");

                verify(droneRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("updateDrone updates and returns enriched ViewModel when drone is available")
        void updateDrone_validInput_updatesAndReturnsEnrichedDrone() {
                when(droneRepository.findById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleDrone));
                when(hubClientService.checkHubExists("h2b2c3d4-e5f6-7890-abcd-ef1234567890")).thenReturn(true);
                when(droneRepository.saveAndFlush(sampleDrone)).thenReturn(sampleDrone);

                when(organizationClientService.getOrganizationById("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleOwner));
                when(hubClientService.getHubById("h1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleHub));
                when(droneMapper.toVm(sampleDrone, sampleOwner, sampleHub, null)).thenReturn(sampleDroneVm);

                DroneVm result = droneService.updateDrone("d1b2c3d4-e5f6-7890-abcd-ef1234567890", samplePutVm);

                assertThat(result).isNotNull();
                assertThat(result.id()).isEqualTo("d1b2c3d4-e5f6-7890-abcd-ef1234567890");
                verify(droneMapper).updateEntityFromPutVm(sampleDrone, samplePutVm);
                verify(droneRepository).saveAndFlush(sampleDrone);
        }

        @Test
        @DisplayName("updateDrone throws NotFoundException when drone ID does not exist")
        void updateDrone_nonExistentDrone_throwsNotFoundException() {
                when(droneRepository.findById("unknown-id")).thenReturn(Optional.empty());

                assertThatThrownBy(() -> droneService.updateDrone("unknown-id", samplePutVm))
                                .isInstanceOf(NotFoundException.class)
                                .hasMessageContaining("unknown-id");
        }

        @Test
        @DisplayName("updateDrone throws BadRequestException when in-flight drone attempts to change home hub")
        void updateDrone_inFlightDroneChangingHomeHub_throwsBadRequestException() {
                sampleDrone.setStatus(DroneStatus.IN_FLIGHT);
                when(droneRepository.findById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleDrone));

                DronePutVm changingHubVm = new DronePutVm(
                                "h2b2c3d4-e5f6-7890-abcd-ef1234567890",
                                null,
                                null,
                                null);

                assertThatThrownBy(
                                () -> droneService.updateDrone("d1b2c3d4-e5f6-7890-abcd-ef1234567890", changingHubVm))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("d1b2c3d4-e5f6-7890-abcd-ef1234567890");

                verify(droneRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("updateDrone throws BadRequestException when in-flight drone attempts to change max payload")
        void updateDrone_inFlightDroneChangingMaxPayload_throwsBadRequestException() {
                sampleDrone.setStatus(DroneStatus.IN_FLIGHT);
                when(droneRepository.findById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleDrone));

                DronePutVm changingPayloadVm = new DronePutVm(
                                sampleDrone.getHomeHubId(),
                                null,
                                5.0,
                                null);

                assertThatThrownBy(() -> droneService.updateDrone("d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                changingPayloadVm))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("d1b2c3d4-e5f6-7890-abcd-ef1234567890");

                verify(droneRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("updateDrone throws BadRequestException when in-flight drone attempts to change to maintenance")
        void updateDrone_inFlightDroneChangingToMaintenance_throwsBadRequestException() {
                sampleDrone.setStatus(DroneStatus.IN_FLIGHT);
                when(droneRepository.findById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleDrone));

                DronePutVm changingStatusVm = new DronePutVm(
                                sampleDrone.getHomeHubId(),
                                null,
                                sampleDrone.getMaxPayload(),
                                DroneStatus.MAINTENANCE);

                assertThatThrownBy(() -> droneService.updateDrone("d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                changingStatusVm))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("d1b2c3d4-e5f6-7890-abcd-ef1234567890");

                verify(droneRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("updateDrone throws NotFoundException when new home hub does not exist")
        void updateDrone_nonExistentNewHomeHub_throwsNotFoundException() {
                when(droneRepository.findById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleDrone));
                when(hubClientService.checkHubExists("h2b2c3d4-e5f6-7890-abcd-ef1234567890")).thenReturn(false);

                assertThatThrownBy(() -> droneService.updateDrone("d1b2c3d4-e5f6-7890-abcd-ef1234567890", samplePutVm))
                                .isInstanceOf(NotFoundException.class)
                                .hasMessageContaining("h2b2c3d4-e5f6-7890-abcd-ef1234567890");

                verify(droneRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("deleteDrone sets drone status to OFFLINE when drone is available")
        void deleteDrone_existingAvailableDrone_setsStatusToOffline() {
                when(droneRepository.findById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleDrone));

                droneService.deleteDrone("d1b2c3d4-e5f6-7890-abcd-ef1234567890");

                assertThat(sampleDrone.getStatus()).isEqualTo(DroneStatus.OFFLINE);
                verify(droneRepository).save(sampleDrone);
        }

        @Test
        @DisplayName("deleteDrone throws BadRequestException when drone is currently in flight")
        void deleteDrone_inFlightDrone_throwsBadRequestException() {
                sampleDrone.setStatus(DroneStatus.IN_FLIGHT);
                when(droneRepository.findById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleDrone));

                assertThatThrownBy(() -> droneService.deleteDrone("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("d1b2c3d4-e5f6-7890-abcd-ef1234567890");

                verify(droneRepository, never()).save(any());
        }

        @Test
        @DisplayName("deleteDrone throws NotFoundException when drone ID does not exist")
        void deleteDrone_nonExistentDrone_throwsNotFoundException() {
                when(droneRepository.findById("unknown-id")).thenReturn(Optional.empty());

                assertThatThrownBy(() -> droneService.deleteDrone("unknown-id"))
                                .isInstanceOf(NotFoundException.class)
                                .hasMessageContaining("unknown-id");

                verify(droneRepository, never()).save(any());
        }
}
