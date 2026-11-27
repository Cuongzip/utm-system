"use client";

import { useTranslations } from "next-intl";
import { FormInput } from "@/components/ui";
import { parseOptionalNumber, type WaypointItem } from "../types";

export interface WaypointConditionsSubTabProps<T extends WaypointItem> {
    waypoint: T;
    onUpdate: (wp: T) => void;
    isReadOnly?: boolean;
    error?: string;
}

export function WaypointConditionsSubTab<T extends WaypointItem>({
    waypoint,
    onUpdate,
    isReadOnly = false,
    error,
}: WaypointConditionsSubTabProps<T>) {
    const t = useTranslations("waypoints.conditions");
    const handleFieldChange = (field: string, val: string) => {
        const num = parseOptionalNumber(val);
        onUpdate({
            ...waypoint,
            conditions: {
                ...waypoint.conditions,
                [field]: num,
            },
        });
    };

    return (
        <div className="space-y-3 pt-1">
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

            <div className="form-row-2">
                <FormInput
                    id="wpSpeed"
                    label={t("speed")}
                    type="number"
                    min="0"
                    placeholder={t("defaultPlaceholder")}
                    value={(waypoint.conditions?.speed as number | undefined) ?? ""}
                    disabled={isReadOnly}
                    onChange={(e) => handleFieldChange("speed", e.target.value)}
                />
                <FormInput
                    id="wpTurnRadius"
                    label={t("turnRadius")}
                    type="number"
                    min="0"
                    placeholder={t("defaultPlaceholder")}
                    value={(waypoint.conditions?.turnRadius as number | undefined) ?? ""}
                    disabled={isReadOnly}
                    onChange={(e) => handleFieldChange("turnRadius", e.target.value)}
                />
            </div>

            <div className="form-row-2">
                <FormInput
                    id="wpWindSpeed"
                    label={t("maxWindSpeed")}
                    type="number"
                    min="0"
                    placeholder={t("windPlaceholder")}
                    value={(waypoint.conditions?.maxWindSpeed as number | undefined) ?? ""}
                    disabled={isReadOnly}
                    onChange={(e) => handleFieldChange("maxWindSpeed", e.target.value)}
                />
                <FormInput
                    id="wpMinVisibility"
                    label={t("minVisibility")}
                    type="number"
                    min="0"
                    placeholder={t("visibilityPlaceholder")}
                    value={(waypoint.conditions?.minVisibility as number | undefined) ?? ""}
                    disabled={isReadOnly}
                    onChange={(e) => handleFieldChange("minVisibility", e.target.value)}
                />
            </div>
        </div>
    );
}
