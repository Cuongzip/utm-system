import type { SelectOption } from "@/components/ui";
import { WAYPOINT_ACTION_TYPES, WAYPOINT_ACTION_LABELS, DEFAULT_WAYPOINT_ACTION } from "@/types";

export interface WaypointItem {
    id?: string;
    tempId?: string;
    sequence?: number;
    name?: string;
    latitude?: number;
    longitude?: number;
    altitude?: number;
    actions?: Record<string, unknown>;
    conditions?: Record<string, unknown>;
}

export const WAYPOINT_ACTION_OPTIONS: SelectOption[] = WAYPOINT_ACTION_TYPES.map((action) => ({
    value: action,
    label: WAYPOINT_ACTION_LABELS[action] || action,
}));

export function parseOptionalNumber(val: string): number | undefined {
    if (!val.trim()) return undefined;
    const num = Number.parseFloat(val);
    return Number.isNaN(num) ? undefined : num;
}

export { DEFAULT_WAYPOINT_ACTION };
