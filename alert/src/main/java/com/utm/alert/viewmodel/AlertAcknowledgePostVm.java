package com.utm.alert.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Payload to acknowledge an alert")
public record AlertAcknowledgePostVm(
        @Schema(description = "Optional operator acknowledgment note", example = "Operator tracking incident, informed remote pilot")
        String note,

        @Schema(description = "Operator name or identifier override", example = "john_operator")
        String acknowledgedBy
) {}
