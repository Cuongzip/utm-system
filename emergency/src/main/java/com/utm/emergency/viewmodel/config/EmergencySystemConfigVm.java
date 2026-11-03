package com.utm.emergency.viewmodel.config;

import com.utm.emergency.model.enumeration.OperationMode;

import java.util.Map;

public record EmergencySystemConfigVm(
        OperationMode mode,
        Map<String, Object> configs
) {
}