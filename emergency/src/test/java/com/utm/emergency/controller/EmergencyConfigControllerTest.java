package com.utm.emergency.controller;

import com.utm.emergency.model.enumeration.OperationMode;
import com.utm.emergency.service.EmergencyConfigService;
import com.utm.emergency.viewmodel.config.EmergencySystemConfigVm;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmergencyConfigControllerTest {

    @Mock
    private EmergencyConfigService configService;

    @InjectMocks
    private EmergencyConfigController configController;

    @Test
    void testGetConfig() {
        when(configService.getSystemConfig()).thenReturn(new EmergencySystemConfigVm(OperationMode.supervised, Map.of()));
        EmergencySystemConfigVm cfg = configController.getConfig();
        assertEquals(OperationMode.supervised, cfg.mode());
    }
}

