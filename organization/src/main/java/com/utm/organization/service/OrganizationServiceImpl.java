package com.utm.organization.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.organization.mapper.OrganizationMapper;
import com.utm.organization.model.Organization;
import com.utm.organization.model.enumeration.OrganizationStatus;
import com.utm.organization.model.enumeration.OrganizationType;
import com.utm.organization.repository.OrganizationRepository;
import com.utm.organization.viewmodel.OrganizationListGetVm;
import com.utm.organization.viewmodel.OrganizationPostVm;
import com.utm.organization.viewmodel.OrganizationPutVm;
import com.utm.organization.viewmodel.OrganizationVm;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class OrganizationServiceImpl implements OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMapper organizationMapper;

    @Override
    @Transactional(readOnly = true)
    public OrganizationListGetVm getOrganizations(
            String search,
            OrganizationType type,
            OrganizationStatus status,
            int limit,
            int offset
    ) {
        int pageSize = limit > 0 ? limit : 20;
        int pageNumber = offset > 0 ? (offset / pageSize) : 0;

        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "createdOn"));

        Specification<Organization> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.trim().isBlank()) {
                String searchPattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), searchPattern),
                        cb.like(cb.lower(root.get("registrationNumber")), searchPattern)
                ));
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

        List<OrganizationVm> items = page.getContent().stream()
                .map(organizationMapper::toVm)
                .toList();

        return OrganizationListGetVm.of(items, page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public OrganizationVm getOrganizationById(String id) {
        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.ORGANIZATION_NOT_FOUND, id));
        return organizationMapper.toVm(organization);
    }

    @Override
    @Transactional
    public OrganizationVm createOrganization(OrganizationPostVm organizationPostVm) {
        Organization organization = organizationMapper.toEntity(organizationPostVm);

        if (organizationRepository.existsByRegistrationNumber(organization.getRegistrationNumber())) {
            throw new DuplicatedException(
                    MessageCode.REGISTRATION_NUMBER_ALREADY_EXISTED,
                    organization.getRegistrationNumber()
            );
        }

        Organization savedOrganization = organizationRepository.saveAndFlush(organization);
        log.info("Created new organization with ID: {} and registration number: {}",
                savedOrganization.getId(), savedOrganization.getRegistrationNumber());
        return organizationMapper.toVm(savedOrganization);
    }

    @Override
    @Transactional
    public OrganizationVm updateOrganization(String id, OrganizationPutVm organizationPutVm) {
        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.ORGANIZATION_NOT_FOUND, id));

        organizationMapper.updateEntityFromPutVm(organization, organizationPutVm);

        Organization updatedOrganization = organizationRepository.saveAndFlush(organization);
        log.info("Updated organization with ID: {}", id);
        return organizationMapper.toVm(updatedOrganization);
    }

    @Override
    @Transactional
    public void deleteOrganization(String id) {
        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.ORGANIZATION_NOT_FOUND, id));

        organization.setStatus(OrganizationStatus.INACTIVE);
        organizationRepository.saveAndFlush(organization);
        log.info("Soft-deleted organization with ID: {} (status set to inactive)", id);
    }
}
