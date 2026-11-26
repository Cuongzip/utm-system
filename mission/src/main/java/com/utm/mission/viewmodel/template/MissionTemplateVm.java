package com.utm.mission.viewmodel.template;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;

@Schema(description = "Mission Template detailed representation")
public record MissionTemplateVm(
        String id,
        String code,
        String name,
        String description,
        String category,
        List<String> tags,
        List<TemplateVariableVm> variables,
        MissionBlueprintVm blueprint,
        Integer version,
        Boolean isLatest,
        String previousVersionId,
        String changelog,
        Integer usageCount,
        Boolean isPublished,
        ZonedDateTime publishedAt,
        ZonedDateTime createdOn,
        String createdBy,
        ZonedDateTime lastModifiedOn,
        String lastModifiedBy
) {
}
