package com.utm.connectivity.viewmodel.stats;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

@Schema(description = "Command router statistics across priority tiers")
public record CommandStatsVm(
        long pendingCount,
        long totalRouted,
        long totalSimulated,
        long totalAcknowledged,
        long totalFailed,
        Map<Integer, Long> byPriority,
        Map<Integer, CommandPriorityConfigVm> priorityConfigs
) {
}
