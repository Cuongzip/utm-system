package com.utm.mission.viewmodel.execution;

import com.utm.mission.viewmodel.client.FlightBriefVm;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Response returned upon executing a mission, containing execution and flight information")
public record MissionExecutionResultVm(
        @Schema(description = "Mission execution progress details") MissionExecutionVm execution,

        @Schema(description = "Primary / initial generated flight plan profile") FlightBriefVm flight,

        @Schema(description = "List of all generated flight plan legs for this mission execution") List<FlightBriefVm> flights) {
    public MissionExecutionResultVm(MissionExecutionVm execution, FlightBriefVm flight) {
        this(execution, flight, flight != null ? List.of(flight) : List.of());
    }
}
