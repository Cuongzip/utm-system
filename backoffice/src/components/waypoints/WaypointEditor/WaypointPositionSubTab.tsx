"use client";

import { useState } from "react";
import { CustomSelect, FormInput } from "@/components/ui";
import {
    ACTIVE_HUB_STATUS,
    STOPOVER_TYPES,
    STOPOVER_TYPE,
    STOPOVER_TYPE_LABELS,
    STOPOVER_DEFAULT_GROUND_TIME,
    WAYPOINT_TYPE,
    type Hub,
    type StopoverType,
} from "@/types";
import type { WaypointItem } from "../types";

export interface WaypointPositionSubTabProps<T extends WaypointItem> {
    waypoint: T;
    onUpdate: (wp: T) => void;
    hubs?: Hub[];
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

const STOPOVER_OPTIONS = STOPOVER_TYPES.map((type) => ({
    value: type,
    label: STOPOVER_TYPE_LABELS[type],
}));

export function WaypointPositionSubTab<T extends WaypointItem>({
    waypoint,
    onUpdate,
    hubs,
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

    const activeStopover: StopoverType = waypoint.stopoverType ?? STOPOVER_TYPE.NONE;
    const isStopover = activeStopover !== STOPOVER_TYPE.NONE;
    const isHubLocked =
        waypoint.waypointType === WAYPOINT_TYPE.HUB || (isStopover && Boolean(waypoint.hubId));
    const selectableHubs = hubs?.filter(
        (h) => h.status === ACTIVE_HUB_STATUS || h.id === waypoint.hubId
    );
    const isPayloadStopover =
        activeStopover === STOPOVER_TYPE.PAYLOAD_DROPOFF ||
        activeStopover === STOPOVER_TYPE.PAYLOAD_PICKUP;

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

    const handleStopoverTypeChange = (val: string) => {
        const nextType = val as StopoverType;
        if (nextType === STOPOVER_TYPE.NONE) {
            const restoredAlt = (waypoint.altitude ?? 0) <= 0 ? defaultAltitude : waypoint.altitude;
            setAltStr(String(restoredAlt ?? defaultAltitude));
            onUpdate({
                ...waypoint,
                waypointType: WAYPOINT_TYPE.COORDINATE,
                stopoverType: STOPOVER_TYPE.NONE,
                hubId: undefined,
                altitude: restoredAlt,
                groundTimeMinutes: undefined,
                payloadDeltaKg: undefined,
            });
            return;
        }
        const defaultGroundTime = STOPOVER_DEFAULT_GROUND_TIME[nextType];
        const isPayload =
            nextType === STOPOVER_TYPE.PAYLOAD_DROPOFF || nextType === STOPOVER_TYPE.PAYLOAD_PICKUP;
        onUpdate({
            ...waypoint,
            waypointType: WAYPOINT_TYPE.HUB,
            stopoverType: nextType,
            groundTimeMinutes: waypoint.groundTimeMinutes ?? defaultGroundTime,
            payloadDeltaKg: isPayload ? (waypoint.payloadDeltaKg ?? 0) : undefined,
        });
    };

    const handleStopoverHubChange = (hubId: string) => {
        if (!hubId) {
            onUpdate({ ...waypoint, hubId: undefined });
            return;
        }
        const hub = hubs?.find((h) => h.id === hubId);
        const nextLat = hub?.location?.latitude ?? waypoint.latitude;
        const nextLng = hub?.location?.longitude ?? waypoint.longitude;
        if (hub?.location?.latitude != null) {
            setLatStr(String(hub.location.latitude));
            onClearLatError?.();
        }
        if (hub?.location?.longitude != null) {
            setLngStr(String(hub.location.longitude));
            onClearLngError?.();
        }
        setAltStr("0");
        onClearAltError?.();
        const isDefaultName = !waypoint.name || /^Waypoint\s+\d+$/i.test(waypoint.name.trim());
        onUpdate({
            ...waypoint,
            waypointType: WAYPOINT_TYPE.HUB,
            hubId,
            latitude: nextLat,
            longitude: nextLng,
            altitude: 0,
            name: isDefaultName && hub ? hub.name || hub.code || waypoint.name : waypoint.name,
        });
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
                    label={isHubLocked ? "Latitude (Hub-locked)" : "Latitude"}
                    required
                    type="number"
                    step="0.000001"
                    value={latStr}
                    disabled={isReadOnly || isHubLocked}
                    onChange={handleLatChange}
                    onBlur={handleLatBlur}
                    error={latError}
                />
                <FormInput
                    id="wpLng"
                    label={isHubLocked ? "Longitude (Hub-locked)" : "Longitude"}
                    required
                    type="number"
                    step="0.000001"
                    value={lngStr}
                    disabled={isReadOnly || isHubLocked}
                    onChange={handleLngChange}
                    onBlur={handleLngBlur}
                    error={lngError}
                />
            </div>

            <FormInput
                id="wpAlt"
                label={isHubLocked ? "Pad Altitude (m AGL, 0 = Ground Pad)" : "Altitude (m AGL)"}
                type="number"
                min={isHubLocked ? "0" : "1"}
                max="1000"
                value={altStr}
                disabled={isReadOnly}
                onChange={handleAltChange}
                onBlur={handleAltBlur}
                error={altError}
            />

            {hubs && (
                <div className="pt-2 border-t border-[var(--color-border-subtle)] space-y-3">
                    <div className="form-group">
                        <label className="form-label" htmlFor="wpStopoverType">
                            Stopover at Hub (Multi-Leg Split)
                        </label>
                        <CustomSelect
                            value={activeStopover}
                            disabled={isReadOnly}
                            onValueChange={handleStopoverTypeChange}
                            options={STOPOVER_OPTIONS}
                            placeholder="None (Fly-Through)"
                        />
                    </div>

                    {isStopover && (
                        <>
                            <div className="form-group">
                                <label className="form-label" htmlFor="wpStopoverHub">
                                    Stopover Hub
                                </label>
                                <CustomSelect
                                    value={waypoint.hubId || ""}
                                    disabled={isReadOnly}
                                    onValueChange={handleStopoverHubChange}
                                    options={[
                                        {
                                            value: "",
                                            label: "Select active hub (auto-fills coords)...",
                                        },
                                        ...(selectableHubs ?? []).map((h) => ({
                                            value: h.id,
                                            label: `${h.name}${h.code ? ` (${h.code})` : ""}`,
                                        })),
                                    ]}
                                    placeholder="Select intermediate hub"
                                />
                            </div>

                            <div className={isPayloadStopover ? "form-row-2" : ""}>
                                <FormInput
                                    id="wpGroundTime"
                                    label="Ground Time (min)"
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={
                                        waypoint.groundTimeMinutes ??
                                        STOPOVER_DEFAULT_GROUND_TIME[activeStopover]
                                    }
                                    disabled={isReadOnly}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        const parsed = Number.parseInt(raw, 10);
                                        onUpdate({
                                            ...waypoint,
                                            groundTimeMinutes:
                                                raw === "" || Number.isNaN(parsed)
                                                    ? undefined
                                                    : Math.max(0, parsed),
                                        });
                                    }}
                                />

                                {isPayloadStopover && (
                                    <FormInput
                                        id="wpPayloadDelta"
                                        label="Payload Delta (kg)"
                                        type="number"
                                        step="0.1"
                                        placeholder={
                                            activeStopover === STOPOVER_TYPE.PAYLOAD_DROPOFF
                                                ? "-1.5"
                                                : "+1.5"
                                        }
                                        value={waypoint.payloadDeltaKg ?? ""}
                                        disabled={isReadOnly}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            const parsed = Number.parseFloat(raw);
                                            onUpdate({
                                                ...waypoint,
                                                payloadDeltaKg:
                                                    raw === "" || Number.isNaN(parsed)
                                                        ? undefined
                                                        : parsed,
                                            });
                                        }}
                                    />
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
