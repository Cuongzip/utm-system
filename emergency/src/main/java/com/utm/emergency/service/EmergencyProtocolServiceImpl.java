package com.utm.emergency.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.emergency.mapper.EmergencyProtocolMapper;
import com.utm.emergency.model.EmergencyProtocol;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
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
                .orElseThrow(() -> new NotFoundException(MessageCode.EMERGENCY_PROTOCOL_NOT_FOUND, "id", id));
        return protocolMapper.toVm(protocol);
    }

    @Override
    @Transactional
    public EmergencyProtocolVm createProtocol(EmergencyProtocolPostVm postVm) {
        if (protocolRepo.findByName(postVm.name().trim()).isPresent()) {
            throw new BadRequestException(MessageCode.NAME_ALREADY_EXISTED, "name", postVm.name().trim());
        }
        if (protocolRepo.findByEmergencyTypeAndSeverity(postVm.emergencyType(), postVm.severity()).isPresent()) {
            throw new DuplicatedException(
                    MessageCode.NAME_ALREADY_EXISTED,
                    "name", postVm.emergencyType().getValue() + "/" + postVm.severity().getValue());
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
                .orElseThrow(() -> new NotFoundException(MessageCode.EMERGENCY_PROTOCOL_NOT_FOUND, "id", id));

        if (putVm.name() != null && !putVm.name().isBlank()
                && !putVm.name().trim().equalsIgnoreCase(protocol.getName())) {
            protocolRepo.findByName(putVm.name().trim()).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new BadRequestException(MessageCode.NAME_ALREADY_EXISTED, "name", putVm.name().trim());
                }
            });
        }

        EmergencyType targetType = (!protocol.isSystemDefault() && putVm.emergencyType() != null)
                ? putVm.emergencyType()
                : protocol.getEmergencyType();
        EmergencySeverity targetSeverity = putVm.severity() != null ? putVm.severity() : protocol.getSeverity();
        if (targetType != protocol.getEmergencyType() || targetSeverity != protocol.getSeverity()) {
            protocolRepo.findByEmergencyTypeAndSeverity(targetType, targetSeverity).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new DuplicatedException(
                            MessageCode.NAME_ALREADY_EXISTED,
                            "name", targetType.getValue() + "/" + targetSeverity.getValue());
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
