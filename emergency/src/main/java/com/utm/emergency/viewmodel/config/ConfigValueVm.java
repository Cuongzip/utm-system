package com.utm.emergency.viewmodel.config;

import jakarta.validation.constraints.NotNull;

public record ConfigValueVm(
        @NotNull Object value,
        String description
) {
}