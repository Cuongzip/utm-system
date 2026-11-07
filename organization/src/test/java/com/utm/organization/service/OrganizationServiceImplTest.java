package com.utm.organization.service;

import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.organization.mapper.OrganizationMapper;
import com.utm.organization.model.Organization;
import com.utm.organization.model.enumeration.OrganizationStatus;
import com.utm.organization.model.enumeration.OrganizationType;
import com.utm.organization.repository.OrganizationRepository;
import com.utm.organization.service.client.DroneClientService;
import com.utm.organization.viewmodel.organization.OrganizationListVm;
import com.utm.organization.viewmodel.organization.OrganizationPostVm;
import com.utm.organization.viewmodel.organization.OrganizationPutVm;
import com.utm.organization.viewmodel.organization.OrganizationVm;
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
import org.springframework.data.jpa.domain.Specification;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SuppressWarnings("unchecked")
@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: OrganizationServiceImpl (Based on docs/api/02-organization.md)")
class OrganizationServiceImplTest {

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private OrganizationMapper organizationMapper;

    @Mock
    private DroneClientService droneClientService;

    @InjectMocks
    private OrganizationServiceImpl organizationService;

    private Organization testOrg;
    private OrganizationVm testOrgVm;
    private OrganizationPostVm testPostVm;
    private OrganizationPutVm testPutVm;

    @BeforeEach
    void setUp() {
        testOrg = Organization.builder()
                .id("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
                .name("Drone Express Vietnam Logistics JSC")
                .type(OrganizationType.OPERATOR)
                .registrationNumber("GP-2026-DK01")
                .contactInfo("contact@droneexpress.com | +84-28-3822-9999")
                .status(OrganizationStatus.ACTIVE)
                .build();

        testOrgVm = new OrganizationVm(
                "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "Drone Express Vietnam Logistics JSC",
                OrganizationType.OPERATOR,
                "GP-2026-DK01",
                "contact@droneexpress.com | +84-28-3822-9999",
                OrganizationStatus.ACTIVE,
                ZonedDateTime.now(),
                "admin-cuong",
                ZonedDateTime.now(),
                "admin-cuong"
        );

        testPostVm = new OrganizationPostVm(
                "Drone Express Vietnam Logistics JSC",
                OrganizationType.OPERATOR,
                "GP-2026-DK01",
                "contact@droneexpress.com | +84-28-3822-9999"
        );

        testPutVm = new OrganizationPutVm(
                "Drone Express Global Logistics Corp",
                OrganizationType.OPERATOR,
                "support@droneexpress.com | +84-28-3822-0000",
                OrganizationStatus.ACTIVE
        );
    }

    @Nested
    @DisplayName("Endpoint: POST /api/v1/organizations (Register Organization)")
    class CreateOrganizationTests {

        @Test
        @DisplayName("Should successfully register organization and return 201 Created ViewModel when input is valid")
        void createOrganization_validInput_savesAndReturnsCreatedVm() {
            when(organizationMapper.toEntity(testPostVm)).thenReturn(testOrg);
            when(organizationRepository.existsByRegistrationNumber("GP-2026-DK01")).thenReturn(false);
            when(organizationRepository.saveAndFlush(any(Organization.class))).thenReturn(testOrg);
            when(organizationMapper.toVm(testOrg)).thenReturn(testOrgVm);

            OrganizationVm result = organizationService.createOrganization(testPostVm);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.name()).isEqualTo("Drone Express Vietnam Logistics JSC");
            assertThat(result.type()).isEqualTo(OrganizationType.OPERATOR);
            assertThat(result.registrationNumber()).isEqualTo("GP-2026-DK01");
            assertThat(result.contactInfo()).isEqualTo("contact@droneexpress.com | +84-28-3822-9999");
            assertThat(result.status()).isEqualTo(OrganizationStatus.ACTIVE);

            verify(organizationRepository).existsByRegistrationNumber("GP-2026-DK01");
            verify(organizationRepository).saveAndFlush(testOrg);
            verify(organizationMapper).toVm(testOrg);
        }

        @Test
        @DisplayName("Should throw DuplicatedException (409 Conflict) when registration number already exists")
        void createOrganization_duplicateRegistrationNumber_throwsDuplicatedException() {
            when(organizationMapper.toEntity(testPostVm)).thenReturn(testOrg);
            when(organizationRepository.existsByRegistrationNumber("GP-2026-DK01")).thenReturn(true);

            assertThatThrownBy(() -> organizationService.createOrganization(testPostVm))
                    .isInstanceOf(DuplicatedException.class)
                    .hasMessageContaining("GP-2026-DK01");

            verify(organizationRepository).existsByRegistrationNumber("GP-2026-DK01");
            verify(organizationRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("Should auto-generate registration number when omitted or blank")
        void createOrganization_nullOrBlankRegistrationNumber_autoGeneratesRegistrationNumber() {
            OrganizationPostVm postVmWithoutRegNumber = new OrganizationPostVm(
                    "Startup Drone Co",
                    OrganizationType.OPERATOR,
                    null,
                    "info@startupdrone.vn"
            );
            Organization orgWithoutRegNumber = Organization.builder()
                    .id("a2b2c3d4-e5f6-7890-abcd-ef1234567890")
                    .name("Startup Drone Co")
                    .type(OrganizationType.OPERATOR)
                    .registrationNumber(null)
                    .status(OrganizationStatus.ACTIVE)
                    .build();

            when(organizationMapper.toEntity(postVmWithoutRegNumber)).thenReturn(orgWithoutRegNumber);
            when(organizationRepository.existsByRegistrationNumber(anyString())).thenReturn(false);
            when(organizationRepository.saveAndFlush(any(Organization.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(organizationMapper.toVm(orgWithoutRegNumber)).thenAnswer(inv -> new OrganizationVm(
                    orgWithoutRegNumber.getId(),
                    orgWithoutRegNumber.getName(),
                    orgWithoutRegNumber.getType(),
                    orgWithoutRegNumber.getRegistrationNumber(),
                    orgWithoutRegNumber.getContactInfo(),
                    orgWithoutRegNumber.getStatus(),
                    null,
                    "admin",
                    null,
                    null
            ));

            OrganizationVm result = organizationService.createOrganization(postVmWithoutRegNumber);

            assertThat(result).isNotNull();
            assertThat(result.registrationNumber()).startsWith("ORG-");
            assertThat(orgWithoutRegNumber.getRegistrationNumber()).startsWith("ORG-");
            verify(organizationRepository).saveAndFlush(orgWithoutRegNumber);
        }
    }

    @Nested
    @DisplayName("Endpoint: GET /api/v1/organizations (List Organizations)")
    class GetOrganizationsTests {

        @Test
        @DisplayName("Should return paginated OrganizationListVm with filtered items and total count")
        void getOrganizations_withFilterAndPagination_returnsListVm() {
            Page<Organization> mockPage = new PageImpl<>(List.of(testOrg));
            when(organizationRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(mockPage);
            when(organizationMapper.toVmList(List.of(testOrg))).thenReturn(List.of(testOrgVm));

            OrganizationListVm result = organizationService.getOrganizations("Express", OrganizationType.OPERATOR, OrganizationStatus.ACTIVE, 10, 0);

            assertThat(result).isNotNull();
            assertThat(result.total()).isEqualTo(1L);
            assertThat(result.items()).hasSize(1);
            assertThat(result.items().getFirst().id()).isEqualTo("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.items().getFirst().registrationNumber()).isEqualTo("GP-2026-DK01");
            assertThat(result.items().getFirst().name()).isEqualTo("Drone Express Vietnam Logistics JSC");

            verify(organizationRepository).findAll(any(Specification.class), any(Pageable.class));
            verify(organizationMapper).toVmList(List.of(testOrg));
        }

        @Test
        @DisplayName("Should return empty list when no organizations match criteria")
        void getOrganizations_noMatch_returnsEmptyListVm() {
            Page<Organization> emptyPage = new PageImpl<>(List.of());
            when(organizationRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(emptyPage);

            OrganizationListVm result = organizationService.getOrganizations("UnknownCompany", null, null, 20, 0);

            assertThat(result).isNotNull();
            assertThat(result.total()).isZero();
            assertThat(result.items()).isEmpty();
        }
    }

    @Nested
    @DisplayName("Endpoint: GET /api/v1/organizations/{id} (Get Organization by ID)")
    class GetOrganizationByIdTests {

        @Test
        @DisplayName("Should return OrganizationVm when organization exists")
        void getOrganizationById_existingId_returnsVm() {
            when(organizationRepository.findById("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(Optional.of(testOrg));
            when(organizationMapper.toVm(testOrg)).thenReturn(testOrgVm);

            OrganizationVm result = organizationService.getOrganizationById("a1b2c3d4-e5f6-7890-abcd-ef1234567890");

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.name()).isEqualTo("Drone Express Vietnam Logistics JSC");
            assertThat(result.type()).isEqualTo(OrganizationType.OPERATOR);
            assertThat(result.registrationNumber()).isEqualTo("GP-2026-DK01");
            assertThat(result.status()).isEqualTo(OrganizationStatus.ACTIVE);

            verify(organizationRepository).findById("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
            verify(organizationMapper).toVm(testOrg);
        }

        @Test
        @DisplayName("Should throw NotFoundException (404) when organization ID does not exist")
        void getOrganizationById_nonExistentId_throwsNotFoundException() {
            when(organizationRepository.findById("non-existent-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> organizationService.getOrganizationById("non-existent-id"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("non-existent-id");

            verify(organizationRepository).findById("non-existent-id");
            verify(organizationMapper, never()).toVm(any());
        }
    }

    @Nested
    @DisplayName("Endpoint: PUT /api/v1/organizations/{id} (Update Organization)")
    class UpdateOrganizationTests {

        @Test
        @DisplayName("Should update allowed mutable fields and return updated OrganizationVm")
        void updateOrganization_existingIdAndValidInput_updatesAndReturnsVm() {
            Organization updatedOrg = Organization.builder()
                    .id("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
                    .name("Drone Express Global Logistics Corp")
                    .type(OrganizationType.OPERATOR)
                    .registrationNumber("GP-2026-DK01")
                    .contactInfo("support@droneexpress.com | +84-28-3822-0000")
                    .status(OrganizationStatus.ACTIVE)
                    .build();

            OrganizationVm updatedVm = new OrganizationVm(
                    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    "Drone Express Global Logistics Corp",
                    OrganizationType.OPERATOR,
                    "GP-2026-DK01",
                    "support@droneexpress.com | +84-28-3822-0000",
                    OrganizationStatus.ACTIVE,
                    ZonedDateTime.now(),
                    "admin-cuong",
                    ZonedDateTime.now(),
                    "admin-cuong"
            );

            when(organizationRepository.findById("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(Optional.of(testOrg));
            doAnswer(invocation -> {
                testOrg.setName(testPutVm.name());
                testOrg.setContactInfo(testPutVm.contactInfo());
                return null;
            }).when(organizationMapper).updateEntityFromPutVm(testOrg, testPutVm);

            when(organizationRepository.saveAndFlush(testOrg)).thenReturn(updatedOrg);
            when(organizationMapper.toVm(updatedOrg)).thenReturn(updatedVm);

            OrganizationVm result = organizationService.updateOrganization("a1b2c3d4-e5f6-7890-abcd-ef1234567890", testPutVm);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
            assertThat(result.name()).isEqualTo("Drone Express Global Logistics Corp");
            assertThat(result.contactInfo()).isEqualTo("support@droneexpress.com | +84-28-3822-0000");
            assertThat(result.status()).isEqualTo(OrganizationStatus.ACTIVE);

            verify(organizationRepository).findById("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
            verify(organizationMapper).updateEntityFromPutVm(testOrg, testPutVm);
            verify(organizationRepository).saveAndFlush(testOrg);
        }

        @Test
        @DisplayName("Should throw NotFoundException (404) when updating non-existent organization")
        void updateOrganization_nonExistentId_throwsNotFoundException() {
            when(organizationRepository.findById("non-existent-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> organizationService.updateOrganization("non-existent-id", testPutVm))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("non-existent-id");

            verify(organizationRepository).findById("non-existent-id");
            verify(organizationRepository, never()).saveAndFlush(any());
        }
    }

    @Nested
    @DisplayName("Endpoint: DELETE /api/v1/organizations/{id} (Soft-delete Organization)")
    class DeleteOrganizationTests {

        @Test
        @DisplayName("Should successfully soft-delete organization by setting status to INACTIVE when no active flights")
        void deleteOrganization_validId_setsStatusInactiveAndSaves() {
            when(organizationRepository.findById("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(Optional.of(testOrg));
            when(droneClientService.hasActiveInFlightDrones("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(false);
            when(organizationRepository.saveAndFlush(any(Organization.class))).thenReturn(testOrg);

            organizationService.deleteOrganization("a1b2c3d4-e5f6-7890-abcd-ef1234567890");

            assertThat(testOrg.getStatus()).isEqualTo(OrganizationStatus.INACTIVE);

            verify(organizationRepository).findById("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
            verify(droneClientService).hasActiveInFlightDrones("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
            verify(organizationRepository).saveAndFlush(testOrg);
        }

        @Test
        @DisplayName("Should throw BadRequestException (400) when organization has active in-flight drones")
        void deleteOrganization_hasActiveInFlightDrones_throwsBadRequestException() {
            when(organizationRepository.findById("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(Optional.of(testOrg));
            when(droneClientService.hasActiveInFlightDrones("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .thenReturn(true);

            assertThatThrownBy(() -> organizationService.deleteOrganization("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("active flight");

            verify(organizationRepository).findById("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
            verify(droneClientService).hasActiveInFlightDrones("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
            verify(organizationRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("Should throw NotFoundException (404) when deleting non-existent organization")
        void deleteOrganization_nonExistentId_throwsNotFoundException() {
            when(organizationRepository.findById("non-existent-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> organizationService.deleteOrganization("non-existent-id"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("non-existent-id");

            verify(organizationRepository).findById("non-existent-id");
            verify(droneClientService, never()).hasActiveInFlightDrones(any());
            verify(organizationRepository, never()).saveAndFlush(any());
        }
    }
}
