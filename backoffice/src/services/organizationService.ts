import { apiClient, buildUrl, normalizeList } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    Organization,
    OrganizationListResponse,
    OrganizationQueryParams,
    CreateOrganizationPayload,
    UpdateOrganizationPayload,
} from "@/types";

export const organizationService = {
    getOrganizations: async (
        params?: OrganizationQueryParams
    ): Promise<OrganizationListResponse> => {
        const endpoint = buildUrl(
            API_ENDPOINTS.ORGANIZATIONS.BASE,
            params as Record<string, unknown>
        );
        const res = await apiClient<OrganizationListResponse | Organization[]>(endpoint);
        return normalizeList<Organization>(res);
    },

    getAll: async (): Promise<Organization[]> => {
        const endpoint = buildUrl(API_ENDPOINTS.ORGANIZATIONS.BASE, { limit: 100 });
        const res = await apiClient<OrganizationListResponse | Organization[]>(endpoint);
        return normalizeList<Organization>(res).items ?? [];
    },

    createOrganization: async (payload: CreateOrganizationPayload): Promise<Organization> => {
        return apiClient<Organization>(API_ENDPOINTS.ORGANIZATIONS.BASE, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    updateOrganization: async (
        id: string,
        payload: UpdateOrganizationPayload
    ): Promise<Organization> => {
        return apiClient<Organization>(API_ENDPOINTS.ORGANIZATIONS.BY_ID(id), {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },

    deleteOrganization: async (id: string): Promise<{ message: string }> => {
        return apiClient<{ message: string }>(API_ENDPOINTS.ORGANIZATIONS.BY_ID(id), {
            method: "DELETE",
        });
    },
};
