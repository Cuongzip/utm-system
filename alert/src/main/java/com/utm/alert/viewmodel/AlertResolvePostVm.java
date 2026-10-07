package com.utm.alert.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Payload to mark an alert as resolved")
public record AlertResolvePostVm(
        @Schema(description = "Resolution commentary or remediation actions taken", example = "Drone returned to corridor, safe separation restored")
        String resolutionNotes,

        @Schema(description = "Operator or agent identifier who resolved the incident", example = "operator_alex")
        String resolvedBy
) {}
