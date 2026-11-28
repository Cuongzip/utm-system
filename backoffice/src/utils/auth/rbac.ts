const SYSTEM_KEYCLOAK_ROLES = new Set(["offline_access", "uma_authorization"]);

const ROLE_PRIORITY = [
    "admin",
    "hub_operator",
    "flight_operator",
    "atc",
    "operator",
    "pilot",
    "viewer",
] as const;

function getOperationalRoles(roles?: string[] | null): string[] {
    if (!roles || roles.length === 0) return [];
    return roles
        .map((r) => r.trim().toLowerCase())
        .filter(
            (r) => r.length > 0 && !SYSTEM_KEYCLOAK_ROLES.has(r) && !r.startsWith("default-roles-")
        );
}

export function getPrimaryDisplayRole(roles?: string[] | null): string {
    const operational = getOperationalRoles(roles);
    if (operational.length === 0) return "USER";

    for (const preferred of ROLE_PRIORITY) {
        if (operational.includes(preferred)) {
            return preferred.replace(/_/g, " ").toUpperCase();
        }
    }

    return operational[0].replace(/_/g, " ").toUpperCase();
}

export function hasAnyRole(
    roles: string[] | null | undefined,
    allowedRoles: readonly string[]
): boolean {
    const operational = getOperationalRoles(roles);
    if (operational.length === 0) return false;
    const allowedSet = new Set(allowedRoles.map((r) => r.toLowerCase()));
    return operational.some((r) => allowedSet.has(r));
}
