package com.utm.mission.mapper;

import com.utm.mission.model.MissionTemplate;
import com.utm.mission.viewmodel.template.MissionTemplatePostVm;
import com.utm.mission.viewmodel.template.MissionTemplateVm;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, unmappedTargetPolicy = ReportingPolicy.IGNORE, builder = @Builder(disableBuilder = true))
public interface MissionTemplateMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "version", constant = "1")
    @Mapping(target = "isLatest", constant = "true")
    @Mapping(target = "previousVersionId", ignore = true)
    @Mapping(target = "changelog", ignore = true)
    @Mapping(target = "usageCount", constant = "0")
    @Mapping(target = "isPublished", constant = "false")
    @Mapping(target = "publishedAt", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    MissionTemplate toEntity(MissionTemplatePostVm postVm);

    MissionTemplateVm toVm(MissionTemplate entity);

    List<MissionTemplateVm> toVmList(List<MissionTemplate> entities);
}
