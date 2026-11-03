package com.utm.emergency.viewmodel.incident;

import jakarta.validation.constraints.NotNull;

public record ConfirmIncidentVm(
        @NotNull Boolean approved
) {
}