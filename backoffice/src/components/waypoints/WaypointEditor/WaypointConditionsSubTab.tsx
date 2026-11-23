"use client";

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
                    label="Speed (m/s)"
                    type="number"
                    min="0"
                    placeholder="Default"
                    value={(waypoint.conditions?.speed as number | undefined) ?? ""}
                    disabled={isReadOnly}
                    onChange={(e) => handleFieldChange("speed", e.target.value)}
                />
                <FormInput
                    id="wpTurnRadius"
                    label="Turn Radius (m)"
                    type="number"
                    min="0"
                    placeholder="Default"
                    value={(waypoint.conditions?.turnRadius as number | undefined) ?? ""}
                    disabled={isReadOnly}
                    onChange={(e) => handleFieldChange("turnRadius", e.target.value)}
                />
            </div>

            <div className="form-row-2">
                <FormInput
                    id="wpWindSpeed"
                    label="Max Wind Speed (m/s)"
                    type="number"
                    min="0"
                    placeholder="e.g. 15"
                    value={(waypoint.conditions?.maxWindSpeed as number | undefined) ?? ""}
                    disabled={isReadOnly}
                    onChange={(e) => handleFieldChange("maxWindSpeed", e.target.value)}
                />
                <FormInput
                    id="wpMinVisibility"
                    label="Min Visibility (m)"
                    type="number"
                    min="0"
                    placeholder="e.g. 5000"
                    value={(waypoint.conditions?.minVisibility as number | undefined) ?? ""}
                    disabled={isReadOnly}
                    onChange={(e) => handleFieldChange("minVisibility", e.target.value)}
                />
            </div>
        </div>
    );
}
