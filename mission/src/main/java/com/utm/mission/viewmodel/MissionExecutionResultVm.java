package com.utm.mission.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Response returned upon executing a mission, containing execution and flight information")
public record MissionExecutionResultVm(
        @Schema(description = "Mission execution progress details")
        MissionExecutionVm execution,

        @Schema(description = "Generated flight plan profile")
        FlightBriefVm flight
) {
}
