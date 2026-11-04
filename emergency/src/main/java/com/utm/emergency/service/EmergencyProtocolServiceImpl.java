package com.utm.emergency.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.emergency.mapper.EmergencyProtocolMapper;
import com.utm.emergency.model.EmergencyProtocol;
import com.utm.emergency.repository.EmergencyProtocolRepository;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolPostVm;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolPutVm;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolVm;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmergencyProtocolServiceImpl implements EmergencyProtocolService {

    private final EmergencyProtocolRepository protocolRepo;
    private final EmergencyProtocolMapper protocolMapper;
    private final DecisionEngineService decisionEngineService;

    @Override
    @Transactional(readOnly = true)
    public List<EmergencyProtocolVm> getProtocols(Boolean active) {
        List<EmergencyProtocol> list = active != null
                ? protocolRepo.findByIsActiveOrderByPriorityAscEmergencyTypeAsc(active)
                : protocolRepo.findAllByOrderByPriorityAscEmergencyTypeAsc();
        return protocolMapper.toVmList(list);
    }

    @Override
    @Transactional(readOnly = true)
    public EmergencyProtocolVm getProtocolById(String id) {
        EmergencyProtocol protocol = protocolRepo.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.EMERGENCY_PROTOCOL_NOT_FOUND, id));
        return protocolMapper.toVm(protocol);
    }

    @Override
    @Transactional
    public EmergencyProtocolVm createProtocol(EmergencyProtocolPostVm postVm) {
        if (protocolRepo.findByName(postVm.name().trim()).isPresent()) {
            throw new BadRequestException("Protocol with name '" + postVm.name().trim() + "' already exists");
        }
        EmergencyProtocol protocol = protocolMapper.toEntity(postVm);
        protocol.setSystemDefault(false);
        EmergencyProtocol saved = protocolRepo.save(protocol);
        decisionEngineService.reloadProtocols();
        return protocolMapper.toVm(saved);
    }

    @Override
    @Transactional
    public EmergencyProtocolVm updateProtocol(String id, EmergencyProtocolPutVm putVm) {
        EmergencyProtocol protocol = protocolRepo.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.EMERGENCY_PROTOCOL_NOT_FOUND, id));

        if (putVm.name() != null && !putVm.name().isBlank()
                && !putVm.name().trim().equalsIgnoreCase(protocol.getName())) {
            protocolRepo.findByName(putVm.name().trim()).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new BadRequestException("Protocol with name '" + putVm.name().trim() + "' already exists");
                }
            });
        }

        if (protocol.isSystemDefault()) {
            EmergencyProtocolPutVm safeVm = new EmergencyProtocolPutVm(
                    putVm.name(),
                    putVm.description(),
                    null,
                    putVm.severity(),
                    null,
                    putVm.fallbackAction(),
                    putVm.requiresConfirmation(),
                    putVm.confirmationTimeoutSeconds(),
                    putVm.autoExecuteOnTimeout(),
                    putVm.priority(),
                    putVm.thresholds(),
                    putVm.conditions(),
                    putVm.notifyPilot(),
                    putVm.notifySupervisor(),
                    putVm.notifyOpsCenter(),
                    putVm.sendSms(),
                    putVm.sendEmail(),
                    putVm.playAudioAlarm(),
                    putVm.isActive());
            protocolMapper.updateEntityFromPutVm(protocol, safeVm);
        } else {
            protocolMapper.updateEntityFromPutVm(protocol, putVm);
        }

        EmergencyProtocol saved = protocolRepo.save(protocol);
        decisionEngineService.reloadProtocols();
        return protocolMapper.toVm(saved);
    }
}