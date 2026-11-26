package com.utm.fleet.service;

import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.fleet.viewmodel.FleetDtos.ApproveRebalancingPostVm;
import com.utm.fleet.viewmodel.FleetDtos.AssignDronePostVm;
import com.utm.fleet.viewmodel.FleetDtos.AssignmentResultVm;
import com.utm.fleet.viewmodel.FleetDtos.CancelRebalancingPostVm;
import com.utm.fleet.viewmodel.FleetDtos.CreateRebalancingPostVm;
import com.utm.fleet.viewmodel.FleetDtos.DroneAvailabilityVm;
import com.utm.fleet.viewmodel.FleetDtos.DroneClientVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetAssignmentVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetConfigPostVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetConfigPutVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetConfigurationVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetOverviewVm;
import com.utm.fleet.viewmodel.FleetDtos.HubFleetStatusVm;
import com.utm.fleet.viewmodel.FleetDtos.RebalancingRecommendationVm;
import com.utm.fleet.viewmodel.FleetDtos.RebalancingTaskVm;
import com.utm.fleet.viewmodel.FleetDtos.RejectAssignmentPostVm;

import java.util.List;

public interface FleetService {

    FleetOverviewVm getFleetOverview();

    HubFleetStatusVm getHubStatus(String hubId);

    List<DroneClientVm> getDronesAtHub(String hubId);

    List<DroneAvailabilityVm> getAvailableDrones(String hubId);

    AssignmentResultVm assignDrone(AssignDronePostVm postVm);

    FleetAssignmentVm acceptAssignment(String id);

    FleetAssignmentVm rejectAssignment(String id, RejectAssignmentPostVm postVm);

    List<FleetAssignmentVm> getAssignmentHistory(String missionId);

    List<RebalancingRecommendationVm> analyzeRebalancingNeeds();

    List<RebalancingTaskVm> getPendingRebalancingTasks();

    List<RebalancingTaskVm> getActiveRebalancingTasks();

    List<RebalancingTaskVm> getRebalancingHistory(int limit, int offset);

    RebalancingTaskVm createRebalancingTask(CreateRebalancingPostVm postVm);

    RebalancingTaskVm approveRebalancingTask(String id, ApproveRebalancingPostVm postVm);

    RebalancingTaskVm executeRebalancingTask(String id);

    RebalancingTaskVm cancelRebalancingTask(String id, CancelRebalancingPostVm postVm);

    RebalancingTaskVm completeRebalancingTask(String id);

    FleetConfigurationVm getActiveConfig();

    List<FleetConfigurationVm> getAllConfigs();

    FleetConfigurationVm getConfigById(String id);

    FleetConfigurationVm createConfig(FleetConfigPostVm postVm);

    FleetConfigurationVm updateConfig(String id, FleetConfigPutVm putVm);

    FleetConfigurationVm activateConfig(String id);

    void handleFlightLifecycleEvent(FlightLifecycleEvent event);
}
