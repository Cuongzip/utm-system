"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { WAYPOINT_TYPE } from "@/types";
import {
    isHubWaypointItem,
    parseHubActionItems,
    parseWaypointActionItems,
    serializeHubActionItems,
    serializeWaypointActions,
    type HubStopoverActionEntry,
    type WaypointActionEntry,
    type WaypointItem,
} from "../types";
import { HubStopoverActionsList } from "./HubStopoverActionsList";
import { AirborneActionsList } from "./AirborneActionsList";

interface WaypointActionsSubTabProps<T extends WaypointItem> {
    waypoint: T;
    onUpdate: (wp: T) => void;
    isReadOnly?: boolean;
    error?: string;
    stopoverTypeError?: string;
    groundTimeError?: string;
    payloadDeltaError?: string;
    onClearStopoverTypeError?: () => void;
    onClearGroundTimeError?: () => void;
    onClearPayloadDeltaError?: () => void;
}

export function WaypointActionsSubTab<T extends WaypointItem>({
    waypoint,
    onUpdate,
    isReadOnly = false,
    error,
    stopoverTypeError,
    groundTimeError,
    payloadDeltaError,
    onClearStopoverTypeError,
    onClearGroundTimeError,
    onClearPayloadDeltaError,
}: WaypointActionsSubTabProps<T>) {
    const t = useTranslations("waypoints");
    const isHubNode = isHubWaypointItem(waypoint);

    const airborneItems = useMemo(() => parseWaypointActionItems(waypoint), [waypoint]);
    const hubItems = useMemo(
        () => (isHubNode ? parseHubActionItems(waypoint) : []),
        [isHubNode, waypoint]
    );
    const waitConfirmed = Boolean(
        waypoint.waitForConfirmation ?? waypoint.actions?.waitForConfirmation
    );

    const commitAirborneItems = (nextItems: WaypointActionEntry[], nextWait = waitConfirmed) => {
        const { actions, hoverDurationSec } = serializeWaypointActions(
            nextItems,
            nextWait,
            waypoint.actions
        );
        onUpdate({
            ...waypoint,
            actions,
            hoverDurationSec,
            waitForConfirmation: nextWait,
        });
    };

    const commitHubItems = (nextHubItems: HubStopoverActionEntry[], nextWait = waitConfirmed) => {
        onClearStopoverTypeError?.();
        const { stopoverType, groundTimeMinutes, payloadDeltaKg, actions } =
            serializeHubActionItems(nextHubItems, nextWait, waypoint.actions);
        onUpdate({
            ...waypoint,
            waypointType: WAYPOINT_TYPE.HUB,
            stopoverType,
            groundTimeMinutes,
            payloadDeltaKg,
            waitForConfirmation: nextWait,
            actions,
        });
    };

    const handleWaitToggle = (checked: boolean) => {
        if (isHubNode) {
            commitHubItems(hubItems, checked);
        } else {
            commitAirborneItems(airborneItems, checked);
        }
    };

    const mergedError = error || stopoverTypeError || groundTimeError || payloadDeltaError;

    return (
        <div className="space-y-3.5 pt-1">
            {mergedError && <p className="text-xs text-red-500 font-medium">{mergedError}</p>}

            {isHubNode ? (
                <HubStopoverActionsList
                    items={hubItems}
                    isReadOnly={isReadOnly}
                    onCommitItems={(nextItems) => commitHubItems(nextItems)}
                    onClearGroundTimeError={onClearGroundTimeError}
                    onClearPayloadDeltaError={onClearPayloadDeltaError}
                />
            ) : (
                <AirborneActionsList
                    items={airborneItems}
                    isReadOnly={isReadOnly}
                    onCommitItems={(nextItems) => commitAirborneItems(nextItems)}
                />
            )}

            <div className="flex items-center gap-2 pt-1">
                <input
                    type="checkbox"
                    id="waitConfirmation"
                    checked={waitConfirmed}
                    disabled={isReadOnly}
                    onChange={(e) => handleWaitToggle(e.target.checked)}
                    className="rounded border-[var(--color-border-default)] cursor-pointer"
                />
                <label
                    htmlFor="waitConfirmation"
                    className="text-xs text-[var(--color-text-primary)] cursor-pointer font-medium"
                >
                    {t("actions.waitConfirmation")}
                </label>
            </div>
        </div>
    );
}
