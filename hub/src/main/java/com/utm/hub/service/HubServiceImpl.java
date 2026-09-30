package com.utm.hub.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.hub.mapper.HubMapper;
import com.utm.hub.model.Hub;
import com.utm.hub.model.enumeration.HubStatus;
import com.utm.hub.repository.HubRepository;
import com.utm.hub.viewmodel.HubPostVm;
import com.utm.hub.viewmodel.HubPutVm;
import com.utm.hub.viewmodel.HubVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class HubServiceImpl implements HubService {

    private final HubRepository hubRepository;
    private final HubMapper hubMapper;

    @Override
    @Transactional(readOnly = true)
    public List<HubVm> getAllHubs() {
        return hubRepository.findAll().stream()
                .map(hubMapper::toVm)
                .toList();
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
        String trimmedCode = hubPostVm.code() != null ? hubPostVm.code().trim() : "";
        if (hubRepository.existsByCode(trimmedCode)) {
            throw new DuplicatedException(
                    MessageCode.HUB_CODE_ALREADY_EXISTED,
                    hubPostVm.code());
        }

        Hub hub = hubMapper.toEntity(hubPostVm);
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
        hub.setStatus(HubStatus.CLOSED);
        hubRepository.save(hub);
        log.info("Deactivated/Closed Hub with ID: {}", id);
    }
}
