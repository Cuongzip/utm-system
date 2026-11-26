package com.utm.fleet.mapper;

import com.utm.fleet.model.FleetAssignment;
import com.utm.fleet.model.FleetConfiguration;
import com.utm.fleet.model.RebalancingTask;
import com.utm.fleet.viewmodel.FleetDtos.FleetAssignmentVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetConfigurationVm;
import com.utm.fleet.viewmodel.FleetDtos.RebalancingTaskVm;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, unmappedTargetPolicy = ReportingPolicy.IGNORE, builder = @Builder(disableBuilder = true))
public interface FleetMapper {

    @Mapping(target = "isPreset", expression = "java(Boolean.TRUE.equals(entity.getIsPreset()))")
    @Mapping(target = "isActive", expression = "java(Boolean.TRUE.equals(entity.getIsActive()))")
    FleetConfigurationVm toConfigVm(FleetConfiguration entity);

    List<FleetConfigurationVm> toConfigVmList(List<FleetConfiguration> entities);

    @Mapping(target = "status", expression = "java(entity.getStatus() != null ? entity.getStatus().getValue() : null)")
    @Mapping(target = "assignedBy", expression = "java(entity.getAssignedBy() != null ? entity.getAssignedBy().getValue() : null)")
    FleetAssignmentVm toAssignmentVm(FleetAssignment entity);

    List<FleetAssignmentVm> toAssignmentVmList(List<FleetAssignment> entities);

    @Mapping(target = "trigger", expression = "java(entity.getTrigger() != null ? entity.getTrigger().getValue() : null)")
    @Mapping(target = "status", expression = "java(entity.getStatus() != null ? entity.getStatus().getValue() : null)")
    RebalancingTaskVm toRebalancingVm(RebalancingTask entity);

    List<RebalancingTaskVm> toRebalancingVmList(List<RebalancingTask> entities);
}
