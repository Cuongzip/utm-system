"use client";

import { useMemo } from "react";
import { useCurrentUser } from "./useQueries";

export interface Permissions {
    isLoading: boolean;
    isAdmin: boolean;
    isAtc: boolean;
    isHubOperator: boolean;
    isPilot: boolean;
    canManageOrganizations: boolean;
    canCreateHub: boolean;
    canEditHub: boolean;
    canDeleteHub: boolean;
    canCreateDrone: boolean;
    canEditDrone: boolean;
    canDeleteDrone: boolean;
    canCreateAirspaceZone: boolean;
    canDeleteAirspaceZone: boolean;
    canAuthorizeFlight: boolean;
    canResolveConflict: boolean;
    canManageEmergencyProtocols: boolean;
    canManageFleet: boolean;
    canManageApiKeys: boolean;
}

export function usePermissions(): Permissions {
    const { data: user, isLoading } = useCurrentUser();

    return useMemo(() => {
        const normalizedRoles = new Set((user?.roles ?? []).map((r) => r.toLowerCase()));
        const isAdmin = normalizedRoles.has("admin");
        const isAtc = normalizedRoles.has("atc");
        const isHubOperator =
            normalizedRoles.has("hub_operator") || normalizedRoles.has("operator");
        const isPilot = normalizedRoles.has("pilot");

        return {
            isLoading,
            isAdmin,
            isAtc,
            isHubOperator,
            isPilot,
            canManageOrganizations: isAdmin,
            canCreateHub: isAdmin,
            canEditHub: isAdmin || isHubOperator,
            canDeleteHub: isAdmin,
            canCreateDrone: isAdmin || isHubOperator,
            canEditDrone: isAdmin || isHubOperator,
            canDeleteDrone: isAdmin,
            canCreateAirspaceZone: isAdmin || isAtc || isHubOperator,
            canDeleteAirspaceZone: isAdmin || isAtc,
            canAuthorizeFlight: isAdmin || isAtc,
            canResolveConflict: isAdmin || isAtc,
            canManageEmergencyProtocols: isAdmin || isAtc,
            canManageFleet: isAdmin || isHubOperator,
            canManageApiKeys: isAdmin,
        };
    }, [user, isLoading]);
}
