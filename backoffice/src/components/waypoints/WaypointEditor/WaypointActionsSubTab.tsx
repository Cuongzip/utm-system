"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CustomSelect, FormInput } from "@/components/ui";
import { WAYPOINT_ACTION_TYPES } from "@/types";
import { DEFAULT_WAYPOINT_ACTION, parseOptionalNumber, type WaypointItem } from "../types";

export interface WaypointActionsSubTabProps<T extends WaypointItem> {
    waypoint: T;
    onUpdate: (wp: T) => void;
    isReadOnly?: boolean;
    error?: string;
}

export function WaypointActionsSubTab<T extends WaypointItem>({
    waypoint,
    onUpdate,
    isReadOnly = false,
    error,
}: WaypointActionsSubTabProps<T>) {
    const t = useTranslations("waypoints");
    const actionOptions = useMemo(
        () =>
            WAYPOINT_ACTION_TYPES.map((action) => ({
                value: action,
                label: t(`actionTypes.${action}`),
            })),
        [t]
    );
    const currentActionType =
        (waypoint.actions?.type as string | undefined) || DEFAULT_WAYPOINT_ACTION;

    const handleActionTypeChange = (newType: string) => {
        onUpdate({
            ...waypoint,
            actions: {
                ...waypoint.actions,
                type: newType,
            },
        });
    };

    const handleDurationChange = (val: string) => {
        const num = parseOptionalNumber(val);
        onUpdate({
            ...waypoint,
            actions: {
                ...waypoint.actions,
                durationS: num,
                hoverDurationS: num,
            },
        });
    };

    const handleWaitToggle = (checked: boolean) => {
        onUpdate({
            ...waypoint,
            actions: {
                ...waypoint.actions,
                waitForConfirmation: checked,
            },
        });
    };

    return (
        <div className="space-y-3 pt-1">
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

            <div className="form-group">
                <label className="form-label">{t("actions.actionType")}</label>
                <CustomSelect
                    options={actionOptions}
                    value={currentActionType}
                    onValueChange={handleActionTypeChange}
                    disabled={isReadOnly}
                />
            </div>

            <FormInput
                id="wpDuration"
                label={t("actions.duration")}
                type="number"
                min="0"
                max="3600"
                placeholder="0"
                value={
                    (waypoint.actions?.durationS as number | undefined) ??
                    (waypoint.actions?.hoverDurationS as number | undefined) ??
                    ""
                }
                disabled={isReadOnly}
                onChange={(e) => handleDurationChange(e.target.value)}
            />

            <div className="flex items-center gap-2 pt-1">
                <input
                    type="checkbox"
                    id="waitConfirmation"
                    checked={Boolean(waypoint.actions?.waitForConfirmation)}
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
