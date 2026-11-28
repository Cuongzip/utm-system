"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { CustomSelect, FormInput } from "@/components/ui";
import { ACTIVE_HUB_STATUS, WAYPOINT_TYPE, type Hub } from "@/types";
import { isHubWaypointItem, type WaypointItem } from "../types";

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
    onClearNameError?: () => void;
    onClearLatError?: () => void;
    onClearLngError?: () => void;
    onClearAltError?: () => void;
    onClearHubIdError?: () => void;
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
    onClearNameError,
    onClearLatError,
    onClearLngError,
    onClearAltError,
    onClearHubIdError,
}: WaypointPositionSubTabProps<T>) {
    const t = useTranslations("waypoints");
    const isHubNode = isHubWaypointItem(waypoint);
    const isHubLocked = Boolean(waypoint.hubId);

    const [latStr, setLatStr] = useState(() => String(waypoint.latitude ?? ""));
    const [lngStr, setLngStr] = useState(() => String(waypoint.longitude ?? ""));
    const [altStr, setAltStr] = useState(() =>
        String(waypoint.altitude ?? (isHubNode ? 0 : defaultAltitude))
    );

    const selectableHubs = useMemo(
        () => hubs?.filter((h) => h.status === ACTIVE_HUB_STATUS || h.id === waypoint.hubId) ?? [],
        [hubs, waypoint.hubId]
    );

    const handleHubChange = (hubId: string) => {
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
        const prevHub = waypoint.hubId ? hubs?.find((h) => h.id === waypoint.hubId) : null;
        const isAutoName =
            !waypoint.name ||
            /^(Waypoint|Điểm bay|Hub Stopover|Trạm dừng)\s+\d+$/i.test(waypoint.name.trim()) ||
            (prevHub != null && (waypoint.name === prevHub.name || waypoint.name === prevHub.code));
        onUpdate({
            ...waypoint,
            waypointType: WAYPOINT_TYPE.HUB,
            hubId,
            latitude: nextLat,
            longitude: nextLng,
            altitude: 0,
            name: isAutoName && hub ? hub.name || hub.code || waypoint.name : waypoint.name,
        });
    };

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
            setAltStr(String(waypoint.altitude ?? (isHubNode ? 0 : defaultAltitude)));
        }
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

            {isHubNode && hubs && (
                <div className="form-group">
                    <label className="form-label" htmlFor="wpStopoverHub">
                        {t("position.stopoverHub")}
                    </label>
                    <CustomSelect
                        value={waypoint.hubId || ""}
                        disabled={isReadOnly}
                        onValueChange={handleHubChange}
                        options={[
                            {
                                value: "",
                                label: t("position.selectActiveHubAutoCoords"),
                            },
                            ...selectableHubs.map((h) => ({
                                value: h.id,
                                label: `${h.name}${h.code ? ` (${h.code})` : ""}`,
                            })),
                        ]}
                        placeholder={t("position.selectIntermediateHub")}
                        error={Boolean(hubIdError)}
                    />
                    {hubIdError && <span className="form-error-msg">{hubIdError}</span>}
                </div>
            )}

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
                label={isHubNode ? t("position.padAltitude") : t("position.altitude")}
                type="number"
                min={isHubNode ? "0" : "1"}
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
