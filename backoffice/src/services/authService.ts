import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type { AuthenticatedUser } from "@/types";

export const authService = {
    getCurrentUser: async (): Promise<AuthenticatedUser> => {
        return apiClient<AuthenticatedUser>(API_ENDPOINTS.AUTH.CURRENT_USER);
    },
};
