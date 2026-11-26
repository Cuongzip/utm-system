package com.utm.connectivity.viewmodel.stats;

import com.utm.connectivity.model.enumeration.DeviceType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;

@Schema(description = "Brief summary of an active online connected device")
public record ConnectedDeviceBriefVm(
        String deviceId,
        String deviceIdentifier,
        DeviceType deviceType,
        String droneId,
        String hubId,
        List<String> protocols,
        String socketId,
        ZonedDateTime lastSeenAt
) {
}
