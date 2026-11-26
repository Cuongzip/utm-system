package com.utm.mission.viewmodel.template;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Parameterized variable definition inside a Mission Template")
public record TemplateVariableVm(
        String key,
        String label,
        String type,
        boolean required,
        Object defaultValue,
        Map<String, Object> validation
) {
}
