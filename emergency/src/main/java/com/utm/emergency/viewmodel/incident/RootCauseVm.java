package com.utm.emergency.viewmodel.incident;

import com.utm.emergency.model.enumeration.RootCause;
import jakarta.validation.constraints.NotNull;

public record RootCauseVm(
        @NotNull RootCause rootCause,
        String notes,
        String lessonsLearned
) {
}