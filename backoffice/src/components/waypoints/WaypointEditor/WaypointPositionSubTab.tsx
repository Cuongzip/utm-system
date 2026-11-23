"use client";

import { useState } from "react";
import { FormInput } from "@/components/ui";
import type { WaypointItem } from "../types";

export interface WaypointPositionSubTabProps<T extends WaypointItem> {
    waypoint: T;
    onUpdate: (wp: T) => void;
    defaultAltitude?: number;
    isReadOnly?: boolean;
    nameError?: string;
    latError?: string;
    lngError?: string;
    altError?: string;
    onClearNameError?: () => void;
    onClearLatError?: () => void;
    onClearLngError?: () => void;
    onClearAltError?: () => void;
}

export function WaypointPositionSubTab<T extends WaypointItem>({
    waypoint,
    onUpdate,
    defaultAltitude = 50,
    isReadOnly = false,
    nameError,
    latError,
    lngError,
    altError,
    onClearNameError,
    onClearLatError,
    onClearLngError,
    onClearAltError,
}: WaypointPositionSubTabProps<T>) {
    const [latStr, setLatStr] = useState(() => String(waypoint.latitude ?? ""));
    const [lngStr, setLngStr] = useState(() => String(waypoint.longitude ?? ""));
    const [altStr, setAltStr] = useState(() => String(waypoint.altitude ?? defaultAltitude));

    const handleLatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLatStr(val);
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && isFinite(parsed)) {
            onUpdate({ ...waypoint, latitude: parsed });
        }
        onClearLatError?.();
    };

    const handleLngChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLngStr(val);
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && isFinite(parsed)) {
            onUpdate({ ...waypoint, longitude: parsed });
        }
        onClearLngError?.();
    };

    const handleAltChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setAltStr(val);
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && isFinite(parsed)) {
            onUpdate({ ...waypoint, altitude: parsed });
        }
        onClearAltError?.();
    };

    const handleLatBlur = () => {
        const parsed = parseFloat(latStr);
        if (isNaN(parsed) || !isFinite(parsed) || latStr.trim() === "") {
            setLatStr(String(waypoint.latitude ?? ""));
        }
    };

    const handleLngBlur = () => {
        const parsed = parseFloat(lngStr);
        if (isNaN(parsed) || !isFinite(parsed) || lngStr.trim() === "") {
            setLngStr(String(waypoint.longitude ?? ""));
        }
    };

    const handleAltBlur = () => {
        const parsed = parseFloat(altStr);
        if (isNaN(parsed) || !isFinite(parsed) || altStr.trim() === "") {
            setAltStr(String(waypoint.altitude ?? defaultAltitude));
        }
    };

    return (
        <div className="space-y-3 pt-1">
            <FormInput
                id="wpName"
                label="Waypoint Name"
                placeholder="e.g. Waypoint 1, Turnpoint Alpha"
                value={waypoint.name || ""}
                disabled={isReadOnly}
                onChange={(e) => {
                    onUpdate({ ...waypoint, name: e.target.value });
                    onClearNameError?.();
                }}
                error={nameError}
            />

            <div className="form-row-2">
                <FormInput
                    id="wpLat"
                    label="Latitude"
                    required
                    type="number"
                    step="0.000001"
                    value={latStr}
                    disabled={isReadOnly}
                    onChange={handleLatChange}
                    onBlur={handleLatBlur}
                    error={latError}
                />
                <FormInput
                    id="wpLng"
                    label="Longitude"
                    required
                    type="number"
                    step="0.000001"
                    value={lngStr}
                    disabled={isReadOnly}
                    onChange={handleLngChange}
                    onBlur={handleLngBlur}
                    error={lngError}
                />
            </div>

            <FormInput
                id="wpAlt"
                label="Altitude (m)"
                type="number"
                min="0"
                max="1000"
                value={altStr}
                disabled={isReadOnly}
                onChange={handleAltChange}
                onBlur={handleAltBlur}
                error={altError}
            />
        </div>
    );
}
