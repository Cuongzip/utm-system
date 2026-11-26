package com.utm.connectivity.viewmodel.stats;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Configuration for a command priority tier")
public record CommandPriorityConfigVm(
        int priority,
        int timeoutMs,
        int maxRetries,
        List<String> commands
) {
}
