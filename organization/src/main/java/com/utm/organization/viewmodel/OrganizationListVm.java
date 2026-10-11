package com.utm.organization.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Paginated list response of organizations")
public record OrganizationListVm(
        @Schema(description = "List of organization items")
        List<OrganizationVm> items,

        @Schema(description = "Total number of organizations matching criteria", example = "10")
        long total
) {
    public static OrganizationListVm of(List<OrganizationVm> items, long total) {
        return new OrganizationListVm(items, total);
    }
}
