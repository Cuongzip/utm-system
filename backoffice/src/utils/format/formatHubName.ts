export function formatHubName(
    hub?: { name?: string; code?: string } | null,
    hubId?: string | null,
    hubMap?: Map<string, string>,
    fallback = "—"
): string {
    if (hub?.name) return hub.name;
    if (hubId) return hubMap?.get(hubId) || hubId;
    return fallback;
}
