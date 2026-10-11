package com.utm.connectivity.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Paginated list response of registered hardware devices")
public record DeviceRegistrationListVm(
        @Schema(description = "List of device registration items")
        List<DeviceRegistrationVm> items,

        @Schema(description = "Total number of device registrations matching criteria", example = "10")
        long total
) {
    public static DeviceRegistrationListVm of(List<DeviceRegistrationVm> items, long total) {
        return new DeviceRegistrationListVm(items, total);
    }
}
