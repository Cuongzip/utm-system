package com.utm.alert.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "Paginated list of alerts")
public record AlertListVm(
        @Schema(description = "List of alert items")
        List<AlertVm> content,

        @Schema(description = "Current page index (0-based)")
        int pageNo,

        @Schema(description = "Page size")
        int pageSize,

        @Schema(description = "Total number of elements")
        long totalElements,

        @Schema(description = "Total pages")
        int totalPages,

        @Schema(description = "Whether this is the last page")
        boolean isLast
) {}
