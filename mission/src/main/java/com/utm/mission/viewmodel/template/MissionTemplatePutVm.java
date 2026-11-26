package com.utm.mission.viewmodel.template;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

import java.util.List;

@Schema(description = "Request payload to update a Mission Template (creates a new version)")
public record MissionTemplatePutVm(
        @Size(min = 1, max = 255)
        String name,
        String description,
        String category,
        List<String> tags,
        List<TemplateVariableVm> variables,
        MissionBlueprintVm blueprint,
        String changelog
) {
}
