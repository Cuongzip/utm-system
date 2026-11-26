package com.utm.mission.viewmodel.template;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

@Schema(description = "Request payload to create a reusable Mission Template")
public record MissionTemplatePostVm(
        @Size(min = 3, max = 50, message = "Template code must be between 3 and 50 characters")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Template code must contain only alphanumeric characters, dashes, and underscores")
        String code,

        @NotBlank(message = "Template name is required")
        @Size(min = 1, max = 255)
        String name,

        String description,
        String category,
        List<String> tags,
        List<TemplateVariableVm> variables,

        @NotNull(message = "Template blueprint is required")
        MissionBlueprintVm blueprint
) {
}
