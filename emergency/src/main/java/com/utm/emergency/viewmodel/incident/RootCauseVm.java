package com.utm.emergency.viewmodel.incident;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.utm.emergency.model.enumeration.RootCause;
import jakarta.validation.constraints.NotNull;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RootCauseVm(
        @NotNull RootCause rootCause,
        @JsonAlias("rootCauseNotes") String notes,
        String lessonsLearned
) {
}
