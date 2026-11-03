package com.utm.emergency.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.emergency.mapper.EmergencyConfigMapper;
import com.utm.emergency.model.EmergencyConfig;
import com.utm.emergency.model.enumeration.OperationMode;
import com.utm.emergency.repository.EmergencyConfigRepository;
import com.utm.emergency.viewmodel.config.ConfigValueVm;
import com.utm.emergency.viewmodel.config.EmergencyConfigVm;
import com.utm.emergency.viewmodel.config.EmergencySystemConfigVm;
import com.utm.emergency.viewmodel.config.OperationModeVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmergencyConfigServiceImpl implements EmergencyConfigService {

    private final EmergencyConfigRepository configRepo;
    private final EmergencyConfigMapper configMapper;
    private final DecisionEngineService decisionEngineService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public EmergencySystemConfigVm getSystemConfig() {
        OperationMode mode = decisionEngineService.getMode();
        Map<String, Object> configs = new HashMap<>();
        configRepo.findAll().forEach(c -> {
            try {
                configs.put(c.getKey(), objectMapper.readTree(c.getValue()));
            } catch (JsonProcessingException e) {
                configs.put(c.getKey(), c.getValue());
            }
        });
        return new EmergencySystemConfigVm(mode, configs);
    }

    @Override
    public OperationModeVm setMode(OperationMode mode) {
        decisionEngineService.setMode(mode);
        return new OperationModeVm(mode);
    }

    @Override
    @Transactional
    public EmergencyConfigVm setConfig(String key, ConfigValueVm vm) {
        String jsonVal;
        try {
            jsonVal = objectMapper.writeValueAsString(vm.value());
        } catch (JsonProcessingException e) {
            jsonVal = String.valueOf(vm.value());
        }

        EmergencyConfig config = configRepo.findByKey(key)
                .orElse(EmergencyConfig.builder().key(key).build());
        config.setValue(jsonVal);
        if (vm.description() != null) config.setDescription(vm.description());

        EmergencyConfig saved = configRepo.save(config);
        return configMapper.toVm(saved);
    }
}