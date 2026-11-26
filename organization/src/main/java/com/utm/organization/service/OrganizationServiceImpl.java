package com.utm.organization.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.generator.BusinessCodeGenerator;
import com.utm.commonlibrary.generator.CodePatternRule;
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

@Service
@Slf4j
public class OrganizationServiceImpl implements OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMapper organizationMapper;
    private final DroneClientService droneClientService;
    private final TransactionTemplate transactionTemplate;

    @Autowired
    public OrganizationServiceImpl(
            OrganizationRepository organizationRepository,
            OrganizationMapper organizationMapper,
            DroneClientService droneClientService,
            @Autowired(required = false) TransactionTemplate transactionTemplate) {
        this.organizationRepository = organizationRepository;
        this.organizationMapper = organizationMapper;
        this.droneClientService = droneClientService;
        this.transactionTemplate = transactionTemplate;
    }

    @Override
    @Transactional(readOnly = true)
    public OrganizationListVm getOrganizations(
            String search,
            OrganizationType type,
            OrganizationStatus status,
            int limit,
            int offset) {
        int pageSize = limit > 0 ? limit : 20;
        int pageNumber = offset > 0 ? (offset / pageSize) : 0;

        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "createdOn"));

        Specification<Organization> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.trim().isBlank()) {
                String searchPattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), searchPattern),
                        cb.like(cb.lower(root.get("registrationNumber")), searchPattern)));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Organization> page = organizationRepository.findAll(spec, pageable);

        List<OrganizationVm> items = organizationMapper.toVmList(page.getContent());

        return OrganizationListVm.of(items, page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public OrganizationVm getOrganizationById(String id) {
        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.ORGANIZATION_NOT_FOUND, "id", id));
        return organizationMapper.toVm(organization);
    }

    @Override
    @Transactional
    public OrganizationVm createOrganization(OrganizationPostVm organizationPostVm) {
        Organization organization = organizationMapper.toEntity(organizationPostVm);

        if (organization.getRegistrationNumber() == null || organization.getRegistrationNumber().isBlank()) {
            organization.setRegistrationNumber(BusinessCodeGenerator.generateUnique(
                    CodePatternRule.ORGANIZATION_REGISTRATION,
                    organizationRepository::existsByRegistrationNumber));
        } else {
            organization.setRegistrationNumber(organization.getRegistrationNumber().trim().toUpperCase());
            if (organizationRepository.existsByRegistrationNumber(organization.getRegistrationNumber())) {
                throw new DuplicatedException(
                        MessageCode.ORGANIZATION_REGISTRATION_NUMBER_ALREADY_EXISTED,
                        "registrationNumber",
                        organization.getRegistrationNumber());
            }
        }

        Organization savedOrganization = organizationRepository.saveAndFlush(organization);
        log.info("Created new organization with ID: {} and registration number: {}",
                savedOrganization.getId(), savedOrganization.getRegistrationNumber());
        return organizationMapper.toVm(savedOrganization);
    }

    @Override
    public OrganizationVm updateOrganization(String id, OrganizationPutVm organizationPutVm) {
        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.ORGANIZATION_NOT_FOUND, "id", id));

        boolean deactivating = organizationPutVm.status() != null
                && organizationPutVm.status() != OrganizationStatus.ACTIVE
                && organization.getStatus() == OrganizationStatus.ACTIVE;
        if (deactivating && droneClientService.hasActiveInFlightDrones(id)) {
            throw new BadRequestException(MessageCode.ORGANIZATION_HAS_ACTIVE_DRONES);
        }

        Organization updatedOrganization;
        if (transactionTemplate != null) {
            updatedOrganization = transactionTemplate.execute(status -> {
                Organization managed = organizationRepository.findById(id)
                        .orElseThrow(() -> new NotFoundException(MessageCode.ORGANIZATION_NOT_FOUND, "id", id));
                organizationMapper.updateEntityFromPutVm(managed, organizationPutVm);
                return organizationRepository.saveAndFlush(managed);
            });
        } else {
            organizationMapper.updateEntityFromPutVm(organization, organizationPutVm);
            updatedOrganization = organizationRepository.saveAndFlush(organization);
        }
        log.info("Updated organization with ID: {}", id);
        return organizationMapper.toVm(updatedOrganization);
    }

    @Override
    public void deleteOrganization(String id) {
        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.ORGANIZATION_NOT_FOUND, "id", id));

        if (droneClientService.hasActiveInFlightDrones(id)) {
            throw new BadRequestException(MessageCode.ORGANIZATION_HAS_ACTIVE_DRONES);
        }

        Runnable persistDeactivation = () -> {
            Organization target = organizationRepository.findById(id).orElse(organization);
            target.setStatus(OrganizationStatus.INACTIVE);
            organizationRepository.saveAndFlush(target);
        };
        if (transactionTemplate != null) {
            transactionTemplate.executeWithoutResult(status -> persistDeactivation.run());
        } else {
            organization.setStatus(OrganizationStatus.INACTIVE);
            organizationRepository.saveAndFlush(organization);
        }
        log.info("Soft-deleted organization with ID: {} (status set to inactive)", id);
    }
}
