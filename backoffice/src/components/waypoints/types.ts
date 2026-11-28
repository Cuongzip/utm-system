import type { SelectOption } from "@/components/ui";
import {
    STOPOVER_DEFAULT_GROUND_TIME,
    STOPOVER_TYPE,
    WAYPOINT_ACTION_TYPE,
    WAYPOINT_ACTION_TYPES,
    WAYPOINT_ACTION_LABELS,
    WAYPOINT_TYPE,
    DEFAULT_WAYPOINT_ACTION,
    type StopoverType,
    type WaypointActionType,
} from "@/types";

export interface WaypointActionEntry {
    type: WaypointActionType;
    parameters?: Record<string, unknown>;
}

export type ActiveStopoverType = Exclude<StopoverType, "none">;

export interface HubStopoverActionEntry {
    type: ActiveStopoverType;
    groundMinutes?: number;
    weightKg?: number;
}

export const AIRBORNE_ACTION_TYPES = [
    WAYPOINT_ACTION_TYPE.PHOTO,
    WAYPOINT_ACTION_TYPE.START_VIDEO,
    WAYPOINT_ACTION_TYPE.STOP_VIDEO,
    WAYPOINT_ACTION_TYPE.ROTATE_GIMBAL,
    WAYPOINT_ACTION_TYPE.HOVER,
    WAYPOINT_ACTION_TYPE.WINCH_DROP,
    WAYPOINT_ACTION_TYPE.PAYLOAD_PICKUP,
    WAYPOINT_ACTION_TYPE.SOUND_ALERT,
] as const;

export const HUB_STOPOVER_ACTION_TYPES: readonly ActiveStopoverType[] = [
    STOPOVER_TYPE.RECHARGE,
    STOPOVER_TYPE.BATTERY_SWAP,
    STOPOVER_TYPE.RELAY_HANDOFF,
    STOPOVER_TYPE.PAYLOAD_PICKUP,
    STOPOVER_TYPE.PAYLOAD_DROPOFF,
] as const;

const HUB_STOPOVER_PRIORITY: Record<ActiveStopoverType, number> = {
    relay_handoff: 5,
    battery_swap: 4,
    recharge: 3,
    payload_pickup: 2,
    payload_dropoff: 1,
};

export interface WaypointItem {
    id?: string;
    tempId?: string;
    sequence?: number;
    name?: string;
    latitude?: number;
    longitude?: number;
    altitude?: number;
    waypointType?: "coordinate" | "hub";
    hubId?: string;
    stopoverType?: StopoverType;
    groundTimeMinutes?: number;
    payloadDeltaKg?: number;
    hoverDurationSec?: number;
    waitForConfirmation?: boolean;
    actions?: Record<string, unknown>;
    conditions?: Record<string, unknown>;
}

export function isHubWaypointItem(waypoint: WaypointItem): boolean {
    return (
        waypoint.waypointType === WAYPOINT_TYPE.HUB ||
        Boolean(waypoint.hubId) ||
        Boolean(waypoint.stopoverType && waypoint.stopoverType !== STOPOVER_TYPE.NONE)
    );
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

const PASSIVE_ACTION_TYPES = new Set<string>([
    WAYPOINT_ACTION_TYPE.FLY_THROUGH,
    WAYPOINT_ACTION_TYPE.TAKEOFF,
    WAYPOINT_ACTION_TYPE.LAND,
    "recharge",
    "battery_swap",
    "relay_handoff",
    "payload_dropoff",
]);

export function parseWaypointActionItems(waypoint: WaypointItem): WaypointActionEntry[] {
    if (isHubWaypointItem(waypoint)) {
        return [];
    }
    const rawActions = waypoint.actions;
    if (!rawActions || typeof rawActions !== "object") {
        if (waypoint.hoverDurationSec && waypoint.hoverDurationSec > 0) {
            return [
                {
                    type: WAYPOINT_ACTION_TYPE.HOVER,
                    parameters: { duration: waypoint.hoverDurationSec },
                },
            ];
        }
        return [];
    }

    if (Array.isArray(rawActions.items)) {
        return rawActions.items
            .filter((item): item is { type: string; parameters?: Record<string, unknown> } =>
                Boolean(item && typeof item === "object" && typeof item.type === "string")
            )
            .map((item) => ({
                type: (item.type === WAYPOINT_ACTION_TYPE.PAYLOAD_DROP
                    ? WAYPOINT_ACTION_TYPE.WINCH_DROP
                    : item.type) as WaypointActionType,
                parameters:
                    item.parameters && typeof item.parameters === "object"
                        ? { ...item.parameters }
                        : {},
            }));
    }

    const legacyType = typeof rawActions.type === "string" ? rawActions.type : undefined;
    if (legacyType && !PASSIVE_ACTION_TYPES.has(legacyType)) {
        const normalizedType = (
            legacyType === WAYPOINT_ACTION_TYPE.PAYLOAD_DROP
                ? WAYPOINT_ACTION_TYPE.WINCH_DROP
                : legacyType
        ) as WaypointActionType;
        const params: Record<string, unknown> = {};
        const dur =
            (rawActions.durationS as number | undefined) ??
            (rawActions.hoverDurationS as number | undefined) ??
            waypoint.hoverDurationSec;
        if (typeof dur === "number" && dur > 0) {
            params.duration = dur;
        }
        if (typeof rawActions.pitch === "number") params.pitch = rawActions.pitch;
        if (typeof rawActions.yaw === "number") params.yaw = rawActions.yaw;
        if (typeof rawActions.bay === "string") params.bay = rawActions.bay;
        if (typeof rawActions.alertType === "string") params.alertType = rawActions.alertType;
        return [{ type: normalizedType, parameters: params }];
    }

    return [];
}

export function serializeWaypointActions(
    items: WaypointActionEntry[],
    waitForConfirmation: boolean,
    existingActions?: Record<string, unknown>
): { actions: Record<string, unknown>; hoverDurationSec: number } {
    const totalHoverSec = items.reduce((sum, item) => {
        if (item.type !== WAYPOINT_ACTION_TYPE.HOVER) return sum;
        const dur = Number(item.parameters?.duration ?? 5);
        return Number.isFinite(dur) && dur > 0 ? sum + Math.round(dur) : sum;
    }, 0);

    const primaryType = items.length > 0 ? items[0].type : DEFAULT_WAYPOINT_ACTION;
    const nextActions: Record<string, unknown> = {
        ...existingActions,
        type: primaryType,
        items,
        waitForConfirmation,
    };
    delete nextActions.hubItems;

    if (totalHoverSec > 0) {
        nextActions.durationS = totalHoverSec;
        nextActions.hoverDurationS = totalHoverSec;
    } else {
        delete nextActions.durationS;
        delete nextActions.hoverDurationS;
    }

    return { actions: nextActions, hoverDurationSec: totalHoverSec };
}

function isActiveStopoverType(val: unknown): val is ActiveStopoverType {
    return (
        typeof val === "string" && (HUB_STOPOVER_ACTION_TYPES as readonly string[]).includes(val)
    );
}

export function parseHubActionItems(waypoint: WaypointItem): HubStopoverActionEntry[] {
    const rawHubItems = waypoint.actions?.hubItems;
    if (Array.isArray(rawHubItems) && rawHubItems.length > 0) {
        const parsed = rawHubItems
            .filter((item): item is { type: string; groundMinutes?: unknown; weightKg?: unknown } =>
                Boolean(item && typeof item === "object" && isActiveStopoverType(item.type))
            )
            .map((item) => {
                const t = item.type as ActiveStopoverType;
                const gm =
                    typeof item.groundMinutes === "number" && Number.isFinite(item.groundMinutes)
                        ? Math.max(0, Math.round(item.groundMinutes))
                        : STOPOVER_DEFAULT_GROUND_TIME[t];
                const wk =
                    typeof item.weightKg === "number" && Number.isFinite(item.weightKg)
                        ? Math.abs(item.weightKg)
                        : undefined;
                return { type: t, groundMinutes: gm, weightKg: wk };
            });
        if (parsed.length > 0) {
            return parsed;
        }
    }

    const fallbackType: ActiveStopoverType = isActiveStopoverType(waypoint.stopoverType)
        ? waypoint.stopoverType
        : STOPOVER_TYPE.RECHARGE;
    const isPayload =
        fallbackType === STOPOVER_TYPE.PAYLOAD_PICKUP ||
        fallbackType === STOPOVER_TYPE.PAYLOAD_DROPOFF;

    return [
        {
            type: fallbackType,
            groundMinutes: waypoint.groundTimeMinutes ?? STOPOVER_DEFAULT_GROUND_TIME[fallbackType],
            weightKg:
                isPayload && waypoint.payloadDeltaKg != null
                    ? Math.abs(waypoint.payloadDeltaKg)
                    : undefined,
        },
    ];
}

export function serializeHubActionItems(
    hubItems: HubStopoverActionEntry[],
    waitForConfirmation: boolean,
    existingActions?: Record<string, unknown>
): {
    stopoverType: ActiveStopoverType;
    groundTimeMinutes: number;
    payloadDeltaKg: number | undefined;
    actions: Record<string, unknown>;
} {
    const safeItems: HubStopoverActionEntry[] =
        hubItems.length > 0
            ? hubItems
            : [
                  {
                      type: STOPOVER_TYPE.RECHARGE,
                      groundMinutes: STOPOVER_DEFAULT_GROUND_TIME.recharge,
                  },
              ];

    let primaryType = safeItems[0].type;
    let totalGroundMinutes = 0;
    let netPayloadDelta = 0;
    let hasPayloadAction = false;

    for (const item of safeItems) {
        if (HUB_STOPOVER_PRIORITY[item.type] > HUB_STOPOVER_PRIORITY[primaryType]) {
            primaryType = item.type;
        }
        const gm = item.groundMinutes ?? STOPOVER_DEFAULT_GROUND_TIME[item.type];
        if (Number.isFinite(gm) && gm > 0) {
            totalGroundMinutes += Math.round(gm);
        }
        if (item.type === STOPOVER_TYPE.PAYLOAD_PICKUP) {
            hasPayloadAction = true;
            const w = item.weightKg ?? 0;
            if (Number.isFinite(w)) netPayloadDelta += Math.abs(w);
        } else if (item.type === STOPOVER_TYPE.PAYLOAD_DROPOFF) {
            hasPayloadAction = true;
            const w = item.weightKg ?? 0;
            if (Number.isFinite(w)) netPayloadDelta -= Math.abs(w);
        }
    }

    const roundedDelta = hasPayloadAction ? Math.round(netPayloadDelta * 100) / 100 : undefined;
    const nextActions: Record<string, unknown> = {
        ...existingActions,
        type: primaryType,
        hubItems: safeItems,
        groundTimeMinutes: totalGroundMinutes,
        waitForConfirmation,
    };
    delete nextActions.items;
    if (roundedDelta !== undefined) {
        nextActions.payloadDeltaKg = roundedDelta;
    } else {
        delete nextActions.payloadDeltaKg;
    }

    return {
        stopoverType: primaryType,
        groundTimeMinutes: totalGroundMinutes,
        payloadDeltaKg: roundedDelta,
        actions: nextActions,
    };
}

export { DEFAULT_WAYPOINT_ACTION };
