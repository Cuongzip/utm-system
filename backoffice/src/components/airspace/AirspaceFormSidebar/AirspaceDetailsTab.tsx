"use client";

import { useState, useEffect, useMemo } from "react";
import { CustomSelect, FormInput, Switch, type SelectOption } from "@/components/ui";
import { cn } from "@/lib";
import {
    type AirspaceZoneType,
    type AirspaceZoneStatus,
    type AirspaceZoneFormPayload,
    type Hub,
    AIRSPACE_ZONE_TYPES,
    AIRSPACE_ZONE_STATUSES,
} from "@/types";

export interface AirspaceDetailsTabProps {
    formData: AirspaceZoneFormPayload;
    onFormChange: <K extends keyof AirspaceZoneFormPayload>(
        field: K,
        value: AirspaceZoneFormPayload[K]
    ) => void;
    isEdit?: boolean;
    hubs?: Hub[];
    fieldErrors?: Record<string, string>;
    onClearFieldError?: (field: string) => void;
}

const ZONE_TYPE_LABELS: Record<AirspaceZoneType, string> = {
    no_fly_zone: "No-Fly Zone (NFZ)",
    restricted: "Restricted Airspace",
    hub_corridor: "Hub Corridor",
    warning: "Advisory / Warning",
};

const ZONE_TYPE_OPTIONS: SelectOption[] = AIRSPACE_ZONE_TYPES.map((type) => ({
    value: type,
    label: ZONE_TYPE_LABELS[type] || type,
}));

const ZONE_STATUS_OPTIONS: SelectOption[] = AIRSPACE_ZONE_STATUSES.map((status) => ({
    value: status,
    label: status === "active" ? "Active" : "Inactive",
}));

export function AirspaceDetailsTab({
    formData,
    onFormChange,
    isEdit = false,
    hubs = [],
    fieldErrors = {},
    onClearFieldError,
}: AirspaceDetailsTabProps) {
    const hubOptions: SelectOption[] = useMemo(
        () => [
            { value: "", label: "None (General Airspace)" },
            ...hubs.map((h) => ({
                value: h.id,
                label: h.name ? `${h.name} (${h.code || "HUB"})` : h.id,
            })),
        ],
        [hubs]
    );

    const [autoGen, setAutoGen] = useState(!isEdit && !formData.code);

    useEffect(() => {
        if (isEdit) {
            setAutoGen(false);
        }
    }, [isEdit]);

    const [altStr, setAltStr] = useState(() =>
        formData.altitudeCeiling !== undefined && formData.altitudeCeiling !== null
            ? String(formData.altitudeCeiling)
            : "120"
    );

    useEffect(() => {
        if (formData.altitudeCeiling !== undefined && formData.altitudeCeiling !== null) {
            setAltStr(String(formData.altitudeCeiling));
        }
    }, [formData.altitudeCeiling]);

    const handleAltitudeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setAltStr(val);
        const parsed = Number(val);
        if (!isNaN(parsed) && isFinite(parsed)) {
            onFormChange("altitudeCeiling", parsed);
        }
        onClearFieldError?.("altitudeCeiling");
    };

    const handleAltitudeBlur = () => {
        const parsed = Number(altStr);
        if (isNaN(parsed) || !isFinite(parsed) || altStr.trim() === "") {
            setAltStr(String(formData.altitudeCeiling ?? 120));
        }
    };

    return (
        <div className="space-y-4">
            <FormInput
                id="airspaceCode"
                label="Code"
                labelRight={
                    !isEdit && (
                        <Switch
                            label="AUTO-GEN"
                            checked={autoGen}
                            onCheckedChange={(checked) => {
                                setAutoGen(checked);
                                if (checked) {
                                    onFormChange("code", "");
                                    onClearFieldError?.("code");
                                }
                            }}
                        />
                    )
                }
                required={!isEdit && !autoGen}
                disabled={isEdit || autoGen}
                placeholder={autoGen ? "" : "e.g. ASZ-SGN01"}
                value={formData.code ?? ""}
                onChange={(e) => {
                    onFormChange("code", e.target.value);
                    onClearFieldError?.("code");
                }}
                error={fieldErrors.code}
            />

            <FormInput
                id="airspaceName"
                label="Zone Name"
                required
                placeholder="e.g. SGN Airport Restricted Sector"
                value={formData.name}
                onChange={(e) => {
                    onFormChange("name", e.target.value);
                    onClearFieldError?.("name");
                }}
                error={fieldErrors.name}
            />

            <div className="form-group">
                <label className="form-label">
                    Classification Type <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    value={formData.zoneType}
                    onValueChange={(val: string) => {
                        onFormChange("zoneType", val as AirspaceZoneType);
                        onClearFieldError?.("zoneType");
                    }}
                    options={ZONE_TYPE_OPTIONS}
                />
            </div>

            <div className="form-group">
                <label className="form-label">Operational Status</label>
                <CustomSelect
                    value={formData.status}
                    onValueChange={(val: string) => {
                        onFormChange("status", val as AirspaceZoneStatus);
                        onClearFieldError?.("status");
                    }}
                    options={ZONE_STATUS_OPTIONS}
                />
            </div>

            <div className="form-group">
                <label className="form-label">Associated Vertiport Hub</label>
                <CustomSelect
                    value={formData.hubId ?? ""}
                    onValueChange={(val: string) => {
                        onFormChange("hubId", val);
                        onClearFieldError?.("hubId");
                    }}
                    options={hubOptions}
                />
                <span className="text-[11px] text-[var(--color-text-muted)]">
                    Optional: associate this restriction sector with a hub station.
                </span>
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="altitudeCeiling">
                    Altitude Ceiling Limit (m) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <input
                        id="altitudeCeiling"
                        type="number"
                        min="10"
                        max="5000"
                        value={altStr}
                        onChange={handleAltitudeChange}
                        onBlur={handleAltitudeBlur}
                        className={cn(
                            "form-input font-mono pr-14",
                            fieldErrors.altitudeCeiling && "form-input-error"
                        )}
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[var(--color-text-muted)] font-mono pointer-events-none">
                        meters
                    </span>
                </div>
                {fieldErrors.altitudeCeiling && (
                    <span className="text-xs text-red-500 mt-1">{fieldErrors.altitudeCeiling}</span>
                )}
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="zoneDesc">
                    Description / Operational Notes
                </label>
                <textarea
                    id="zoneDesc"
                    rows={3}
                    value={formData.description ?? ""}
                    onChange={(e) => {
                        onFormChange("description", e.target.value);
                        onClearFieldError?.("description");
                    }}
                    placeholder="Enter legal basis, operational constraints, or activation schedule..."
                    className="form-input resize-none"
                />
            </div>
        </div>
    );
}
