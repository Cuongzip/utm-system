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
import com.utm.hub.service.client.FlightClientService;
import com.utm.hub.viewmodel.hub.HubListVm;
import com.utm.hub.viewmodel.hub.HubPostVm;
import com.utm.hub.viewmodel.hub.HubPutVm;
import com.utm.hub.viewmodel.hub.HubVm;
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
public class HubServiceImpl implements HubService {

    private final HubRepository hubRepository;
    private final HubMapper hubMapper;
    private final FlightClientService flightClientService;

    @Override
    @Transactional(readOnly = true)
    public HubListVm getHubs(String search, HubStatus status, int limit, int offset) {
        Specification<Hub> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.trim().isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("code")), pattern)
                ));
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
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, id));
        return hubMapper.toVm(hub);
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
                        hubPostVm.code());
            }
        } else {
            hubCode = BusinessCodeGenerator.generateUnique(
                    CodePatternRule.HUB_CODE,
                    hubRepository::existsByCode
            );
        }

        Hub hub = hubMapper.toEntity(hubPostVm);
        hub.setCode(hubCode);
        Hub savedHub = hubRepository.saveAndFlush(hub);
        log.info("Created new Hub with ID: {} and code: {}", savedHub.getId(), savedHub.getCode());
        return hubMapper.toVm(savedHub);
    }

    @Override
    @Transactional
    public HubVm updateHub(String id, HubPutVm hubPutVm) {
        Hub hub = hubRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, id));

        hubMapper.updateEntityFromPutVm(hub, hubPutVm);

        Hub updatedHub = hubRepository.saveAndFlush(hub);
        log.info("Updated Hub with ID: {}", id);
        return hubMapper.toVm(updatedHub);
    }

    @Override
    @Transactional
    public void deactivateHub(String id) {
        Hub hub = hubRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, id));

        if (flightClientService.hasActiveFlightsAtHub(id)) {
            throw new BadRequestException("Cannot deactivate hub with flights currently active");
        }

        hub.setStatus(HubStatus.INACTIVE);
        hubRepository.save(hub);
        log.info("Deactivated Hub with ID: {}", id);
    }
}
