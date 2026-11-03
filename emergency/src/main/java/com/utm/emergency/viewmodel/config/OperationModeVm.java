package com.utm.emergency.viewmodel.config;

import com.utm.emergency.model.enumeration.OperationMode;
import jakarta.validation.constraints.NotNull;

public record OperationModeVm(
        @NotNull OperationMode mode
) {
}