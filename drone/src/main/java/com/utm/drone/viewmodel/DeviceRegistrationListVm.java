package com.utm.drone.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Paginated list response of device registrations from connectivity service")
public record DeviceRegistrationListVm(
        @Schema(description = "List of device registrations")
        List<DeviceRegistrationBriefVm> items,

        @Schema(description = "Total count of device registrations")
        long total
) {
}
