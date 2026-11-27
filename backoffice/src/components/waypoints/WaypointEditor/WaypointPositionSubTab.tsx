"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { CustomSelect, FormInput } from "@/components/ui";
import {
    ACTIVE_HUB_STATUS,
    STOPOVER_TYPES,
    STOPOVER_TYPE,
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
    hubIdError?: string;
    stopoverTypeError?: string;
    groundTimeError?: string;
    payloadDeltaError?: string;
    onClearNameError?: () => void;
    onClearLatError?: () => void;
    onClearLngError?: () => void;
    onClearAltError?: () => void;
    onClearHubIdError?: () => void;
    onClearStopoverTypeError?: () => void;
    onClearGroundTimeError?: () => void;
    onClearPayloadDeltaError?: () => void;
}

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
    hubIdError,
    stopoverTypeError,
    groundTimeError,
    payloadDeltaError,
    onClearNameError,
    onClearLatError,
    onClearLngError,
    onClearAltError,
    onClearHubIdError,
    onClearStopoverTypeError,
    onClearGroundTimeError,
    onClearPayloadDeltaError,
}: WaypointPositionSubTabProps<T>) {
    const t = useTranslations("waypoints");
    const stopoverOptions = useMemo(
        () =>
            STOPOVER_TYPES.map((type) => ({
                value: type,
                label: t(`stopoverTypes.${type}`),
            })),
        [t]
    );
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
        onClearStopoverTypeError?.();
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
        onClearHubIdError?.();
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
                label={t("position.name")}
                placeholder={t("position.namePlaceholder")}
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
                    label={isHubLocked ? t("position.latitudeLocked") : t("position.latitude")}
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
                    label={isHubLocked ? t("position.longitudeLocked") : t("position.longitude")}
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
                label={isHubLocked ? t("position.padAltitude") : t("position.altitude")}
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
                            {t("position.stopoverLabel")}
                        </label>
                        <CustomSelect
                            value={activeStopover}
                            disabled={isReadOnly}
                            onValueChange={handleStopoverTypeChange}
                            options={stopoverOptions}
                            placeholder={t("stopoverTypes.none")}
                            error={Boolean(stopoverTypeError)}
                        />
                        {stopoverTypeError && (
                            <span className="form-error-msg">{stopoverTypeError}</span>
                        )}
                    </div>

                    {isStopover && (
                        <>
                            <div className="form-group">
                                <label className="form-label" htmlFor="wpStopoverHub">
                                    {t("position.stopoverHub")}
                                </label>
                                <CustomSelect
                                    value={waypoint.hubId || ""}
                                    disabled={isReadOnly}
                                    onValueChange={handleStopoverHubChange}
                                    options={[
                                        {
                                            value: "",
                                            label: t("position.selectActiveHubAutoCoords"),
                                        },
                                        ...(selectableHubs ?? []).map((h) => ({
                                            value: h.id,
                                            label: `${h.name}${h.code ? ` (${h.code})` : ""}`,
                                        })),
                                    ]}
                                    placeholder={t("position.selectIntermediateHub")}
                                    error={Boolean(hubIdError)}
                                />
                                {hubIdError && <span className="form-error-msg">{hubIdError}</span>}
                            </div>

                            <div className={isPayloadStopover ? "form-row-2" : ""}>
                                <FormInput
                                    id="wpGroundTime"
                                    label={t("position.groundTime")}
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={
                                        waypoint.groundTimeMinutes ??
                                        STOPOVER_DEFAULT_GROUND_TIME[activeStopover]
                                    }
                                    disabled={isReadOnly}
                                    error={groundTimeError}
                                    onChange={(e) => {
                                        onClearGroundTimeError?.();
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
                                        label={t("position.payloadDelta")}
                                        type="number"
                                        step="0.1"
                                        placeholder={
                                            activeStopover === STOPOVER_TYPE.PAYLOAD_DROPOFF
                                                ? "-1.5"
                                                : "+1.5"
                                        }
                                        value={waypoint.payloadDeltaKg ?? ""}
                                        disabled={isReadOnly}
                                        error={payloadDeltaError}
                                        onChange={(e) => {
                                            onClearPayloadDeltaError?.();
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
