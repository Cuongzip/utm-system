package com.utm.hub.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.utils.MessagesUtils;
import com.utm.hub.mapper.HubMapper;
import com.utm.hub.model.Hub;
import com.utm.hub.model.Location;
import com.utm.hub.model.enumeration.HubStatus;
import com.utm.hub.repository.HubRepository;
import com.utm.hub.service.client.FlightClientService;
import com.utm.hub.viewmodel.hub.HubListVm;
import com.utm.hub.viewmodel.hub.HubPostVm;
import com.utm.hub.viewmodel.hub.HubPutVm;
import com.utm.hub.viewmodel.hub.HubVm;
import com.utm.hub.viewmodel.hub.LocationVm;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import org.mockito.ArgumentCaptor;

@SuppressWarnings("unchecked")
@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: HubServiceImpl (Based on docs/api/03-hub.md)")
class HubServiceImplTest {

    @Mock
    private HubRepository hubRepository;

    @Mock
    private HubMapper hubMapper;

    @Mock
    private FlightClientService flightClientService;

    @InjectMocks
    private HubServiceImpl hubService;

    private Hub testHub;
    private HubVm testHubVm;
    private HubPostVm testPostVm;
    private HubPutVm testPutVm;
    private LocationVm testLocationVm;

    @BeforeEach
    void setUp() {
        testLocationVm = new LocationVm(10.7769, 106.7009);

        testHub = Hub.builder()
                .id("h1b2c3d4-e5f6-7890-abcd-ef1234567890")
                .code("HUB-SGN-01")
                .name("Central Vertiport Hub D1")
                .location(Location.builder().latitude(10.7769).longitude(106.7009).build())
                .altitudeMsl(12.5)
                .airspaceRadius(1500.0)
                .status(HubStatus.ACTIVE)
                .build();

        testHubVm = new HubVm(
                "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "HUB-SGN-01",
                "Central Vertiport Hub D1",
                testLocationVm,
                12.5,
                1500.0,
                HubStatus.ACTIVE,
                ZonedDateTime.now(),
                ZonedDateTime.now());

        testPostVm = new HubPostVm(
                "HUB-SGN-01",
                "Central Vertiport Hub D1",
                testLocationVm,
                12.5,
                1500.0);

        testPutVm = new HubPutVm(
                "Central Vertiport Hub D1 (Expansion)",
                testLocationVm,
                15.0,
                2000.0,
                HubStatus.MAINTENANCE);
    }

    @Nested
    @DisplayName("Endpoint: POST /api/v1/hubs (Register Hub)")
    class CreateHubTests {

        @Test
        @DisplayName("Should successfully register hub and return 201 Created ViewModel when input is valid")
        void createHub_validInput_savesAndReturnsCreatedVm() {
            when(hubRepository.existsByCode("HUB-SGN-01")).thenReturn(false);
            when(hubMapper.toEntity(testPostVm)).thenReturn(testHub);
            when(hubRepository.saveAndFlush(any(Hub.class))).thenReturn(testHub);
            when(hubMapper.toVm(testHub)).thenReturn(testHubVm);

            HubVm result = hubService.createHub(testPostVm);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo("h1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.code()).isEqualTo("HUB-SGN-01");
            assertThat(result.name()).isEqualTo("Central Vertiport Hub D1");
            assertThat(result.altitudeMsl()).isEqualTo(12.5);
            assertThat(result.airspaceRadius()).isEqualTo(1500.0);
            assertThat(result.status()).isEqualTo(HubStatus.ACTIVE);
            assertThat(result.location().latitude()).isEqualTo(10.7769);
            assertThat(result.location().longitude()).isEqualTo(106.7009);

            verify(hubRepository).existsByCode("HUB-SGN-01");
            verify(hubRepository).saveAndFlush(testHub);
            verify(hubMapper).toVm(testHub);
        }

        @Test
        @DisplayName("Should throw DuplicatedException (409 Conflict) when hub code already exists")
        void createHub_duplicateCode_throwsDuplicatedException() {
            when(hubRepository.existsByCode("HUB-SGN-01")).thenReturn(true);

            assertThatThrownBy(() -> hubService.createHub(testPostVm))
                    .isInstanceOf(DuplicatedException.class)
                    .hasMessage(MessagesUtils.getCleanMessage(MessageCode.HUB_CODE_ALREADY_EXISTED))
                    .extracting(ex -> ((DuplicatedException) ex).getParams().get("code"))
                    .isEqualTo("HUB-SGN-01");

            verify(hubRepository).existsByCode("HUB-SGN-01");
            verify(hubRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("Should auto-generate hub code when code is null or blank in input payload")
        void createHub_nullOrBlankCode_autoGeneratesHubCode() {
            HubPostVm postVmWithoutCode = new HubPostVm(
                    null,
                    "Central Vertiport Hub D1",
                    testLocationVm,
                    12.5,
                    1500.0);

            when(hubRepository.existsByCode(anyString())).thenReturn(false);
            when(hubMapper.toEntity(postVmWithoutCode)).thenReturn(testHub);
            when(hubRepository.saveAndFlush(any(Hub.class))).thenReturn(testHub);
            when(hubMapper.toVm(testHub)).thenReturn(testHubVm);

            HubVm result = hubService.createHub(postVmWithoutCode);

            assertThat(result).isNotNull();
            ArgumentCaptor<Hub> hubCaptor = ArgumentCaptor.forClass(Hub.class);
            verify(hubRepository).saveAndFlush(hubCaptor.capture());
            assertThat(hubCaptor.getValue().getCode()).startsWith("HUB-").hasSize(8);
        }
    }

    @Nested
    @DisplayName("Endpoint: GET /api/v1/hubs (List Hubs)")
    class GetHubsTests {

        @Test
        @DisplayName("Should return paginated HubListVm with filtered items and total count")
        void getHubs_withFilterAndPagination_returnsListVm() {
            Page<Hub> mockPage = new PageImpl<>(List.of(testHub));
            when(hubRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(mockPage);
            when(hubMapper.toVmList(List.of(testHub))).thenReturn(List.of(testHubVm));

            HubListVm result = hubService.getHubs("SGN", HubStatus.ACTIVE, 20, 0);

            assertThat(result).isNotNull();
            assertThat(result.total()).isEqualTo(1L);
            assertThat(result.items()).hasSize(1);
            assertThat(result.items().getFirst().id()).isEqualTo("h1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.items().getFirst().code()).isEqualTo("HUB-SGN-01");
            assertThat(result.items().getFirst().name()).isEqualTo("Central Vertiport Hub D1");

            verify(hubRepository).findAll(any(Specification.class), any(Pageable.class));
            verify(hubMapper).toVmList(List.of(testHub));
        }

        @Test
        @DisplayName("Should return empty list when no hubs match criteria")
        void getHubs_noMatch_returnsEmptyListVm() {
            Page<Hub> emptyPage = new PageImpl<>(List.of());
            when(hubRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(emptyPage);
            when(hubMapper.toVmList(List.of())).thenReturn(List.of());

            HubListVm result = hubService.getHubs("Unknown", null, 10, 0);

            assertThat(result).isNotNull();
            assertThat(result.total()).isZero();
            assertThat(result.items()).isEmpty();
        }

        @Test
        @DisplayName("Should return unpaged result when limit is less than or equal to zero")
        void getHubs_limitLessThanOrEqualToZero_returnsAllUnpaged() {
            when(hubRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(testHub));
            when(hubMapper.toVmList(List.of(testHub))).thenReturn(List.of(testHubVm));

            HubListVm result = hubService.getHubs(null, null, 0, 0);

            assertThat(result).isNotNull();
            assertThat(result.total()).isEqualTo(1L);
            assertThat(result.items()).hasSize(1);
            assertThat(result.items().getFirst().code()).isEqualTo("HUB-SGN-01");

            verify(hubRepository).findAll(any(Specification.class), any(Sort.class));
            verify(hubMapper).toVmList(List.of(testHub));
        }
    }

    @Nested
    @DisplayName("Endpoint: GET /api/v1/hubs/{id} (Get Hub by ID)")
    class GetHubByIdTests {

        @Test
        @DisplayName("Should return HubVm when hub exists")
        void getHubById_existingId_returnsHubVm() {
            when(hubRepository.findById("h1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(Optional.of(testHub));
            when(hubMapper.toVm(testHub)).thenReturn(testHubVm);

            HubVm result = hubService.getHubById("h1b2c3d4-e5f6-7890-abcd-ef1234567890");

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo("h1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.code()).isEqualTo("HUB-SGN-01");
            assertThat(result.name()).isEqualTo("Central Vertiport Hub D1");
            assertThat(result.altitudeMsl()).isEqualTo(12.5);
            assertThat(result.airspaceRadius()).isEqualTo(1500.0);
            assertThat(result.status()).isEqualTo(HubStatus.ACTIVE);

            verify(hubRepository).findById("h1b2c3d4-e5f6-7890-abcd-ef1234567890");
            verify(hubMapper).toVm(testHub);
        }

        @Test
        @DisplayName("Should throw NotFoundException (404) when hub ID does not exist")
        void getHubById_nonExistentId_throwsNotFoundException() {
            when(hubRepository.findById("non-existent-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> hubService.getHubById("non-existent-id"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessage(MessagesUtils.getCleanMessage(MessageCode.HUB_NOT_FOUND))
                    .extracting(ex -> ((NotFoundException) ex).getParams().get("id"))
                    .isEqualTo("non-existent-id");

            verify(hubRepository).findById("non-existent-id");
            verify(hubMapper, never()).toVm(any());
        }
    }

    @Nested
    @DisplayName("Endpoint: PUT /api/v1/hubs/{id} (Update Hub)")
    class UpdateHubTests {

        @Test
        @DisplayName("Should update allowed mutable fields and return updated HubVm")
        void updateHub_existingIdAndValidInput_updatesAndReturnsVm() {
            Hub updatedHub = Hub.builder()
                    .id("h1b2c3d4-e5f6-7890-abcd-ef1234567890")
                    .code("HUB-SGN-01")
                    .name("Central Vertiport Hub D1 (Expansion)")
                    .location(Location.builder().latitude(10.7769).longitude(106.7009).build())
                    .altitudeMsl(15.0)
                    .airspaceRadius(2000.0)
                    .status(HubStatus.MAINTENANCE)
                    .build();

            HubVm updatedHubVm = new HubVm(
                    "h1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    "HUB-SGN-01",
                    "Central Vertiport Hub D1 (Expansion)",
                    testLocationVm,
                    15.0,
                    2000.0,
                    HubStatus.MAINTENANCE,
                    ZonedDateTime.now(),
                    ZonedDateTime.now());

            when(hubRepository.findById("h1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(Optional.of(testHub));
            doAnswer(invocation -> {
                testHub.setName(testPutVm.name());
                testHub.setAltitudeMsl(testPutVm.altitudeMsl());
                testHub.setAirspaceRadius(testPutVm.airspaceRadius());
                testHub.setStatus(testPutVm.status());
                return null;
            }).when(hubMapper).updateEntityFromPutVm(testHub, testPutVm);

            when(hubRepository.saveAndFlush(testHub)).thenReturn(updatedHub);
            when(hubMapper.toVm(updatedHub)).thenReturn(updatedHubVm);

            HubVm result = hubService.updateHub("h1b2c3d4-e5f6-7890-abcd-ef1234567890", testPutVm);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo("h1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.name()).isEqualTo("Central Vertiport Hub D1 (Expansion)");
            assertThat(result.altitudeMsl()).isEqualTo(15.0);
            assertThat(result.airspaceRadius()).isEqualTo(2000.0);
            assertThat(result.status()).isEqualTo(HubStatus.MAINTENANCE);

            verify(hubRepository).findById("h1b2c3d4-e5f6-7890-abcd-ef1234567890");
            verify(hubMapper).updateEntityFromPutVm(testHub, testPutVm);
            verify(hubRepository).saveAndFlush(testHub);
        }

        @Test
        @DisplayName("Should throw NotFoundException (404) when updating non-existent hub")
        void updateHub_nonExistentId_throwsNotFoundException() {
            when(hubRepository.findById("non-existent-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> hubService.updateHub("non-existent-id", testPutVm))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessage(MessagesUtils.getCleanMessage(MessageCode.HUB_NOT_FOUND))
                    .extracting(ex -> ((NotFoundException) ex).getParams().get("id"))
                    .isEqualTo("non-existent-id");

            verify(hubRepository).findById("non-existent-id");
            verify(hubRepository, never()).saveAndFlush(any());
        }
    }

    @Nested
    @DisplayName("Endpoint: DELETE /api/v1/hubs/{id} (Deactivate Hub)")
    class DeactivateHubTests {

        @Test
        @DisplayName("Should successfully deactivate hub by setting status to INACTIVE")
        void deactivateHub_validId_setsStatusInactiveAndSaves() {
            when(hubRepository.findById("h1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(Optional.of(testHub));
            when(flightClientService.hasActiveFlightsAtHub("h1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(false);
            when(hubRepository.save(any(Hub.class))).thenReturn(testHub);

            hubService.deactivateHub("h1b2c3d4-e5f6-7890-abcd-ef1234567890");

            assertThat(testHub.getStatus()).isEqualTo(HubStatus.INACTIVE);

            verify(hubRepository).findById("h1b2c3d4-e5f6-7890-abcd-ef1234567890");
            verify(flightClientService).hasActiveFlightsAtHub("h1b2c3d4-e5f6-7890-abcd-ef1234567890");
            verify(hubRepository).save(testHub);
        }

        @Test
        @DisplayName("Should throw NotFoundException (404) when deactivating non-existent hub")
        void deactivateHub_nonExistentId_throwsNotFoundException() {
            when(hubRepository.findById("non-existent-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> hubService.deactivateHub("non-existent-id"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessage(MessagesUtils.getCleanMessage(MessageCode.HUB_NOT_FOUND))
                    .extracting(ex -> ((NotFoundException) ex).getParams().get("id"))
                    .isEqualTo("non-existent-id");

            verify(hubRepository).findById("non-existent-id");
            verify(hubRepository, never()).save(any());
        }
    }
}
