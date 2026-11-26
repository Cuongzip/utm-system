"use client";

import { useMemo } from "react";
import {
    CustomSelect,
    FormInput,
    AutoGenInput,
    DateTimePicker,
    type SelectOption,
} from "@/components/ui";
import {
    type AirspaceZoneType,
    type AirspaceZoneStatus,
    type AirspaceZoneFormPayload,
    type Hub,
    AIRSPACE_ZONE_TYPES,
    AIRSPACE_ZONE_STATUSES,
    AIRSPACE_ZONE_TYPE_LABELS,
    AIRSPACE_ZONE_STATUS_LABELS,
    HUB_STATUS,
} from "@/types";

export interface AirspaceDetailsTabProps {
    formData: AirspaceZoneFormPayload;
    onFormChange: <K extends keyof AirspaceZoneFormPayload>(
        field: K,
        value: AirspaceZoneFormPayload[K]
    ) => void;
    isEdit: boolean;
    hubs: Hub[];
    fieldErrors: Record<string, string>;
    onClearFieldError: (field: string) => void;
}

const ZONE_TYPE_OPTIONS: SelectOption[] = AIRSPACE_ZONE_TYPES.map((type) => ({
    value: type,
    label: AIRSPACE_ZONE_TYPE_LABELS[type] || type,
}));

const ZONE_STATUS_OPTIONS: SelectOption[] = AIRSPACE_ZONE_STATUSES.map((status) => ({
    value: status,
    label: AIRSPACE_ZONE_STATUS_LABELS[status] || status,
}));

export function AirspaceDetailsTab({
    formData,
    onFormChange,
    isEdit = false,
    hubs = [],
    fieldErrors = {},
    onClearFieldError,
}: AirspaceDetailsTabProps) {
    const hubOptions: SelectOption[] = useMemo(() => {
        const sorted = [...hubs].sort((a, b) => {
            const aInact = (a.status || "").toLowerCase() === HUB_STATUS.INACTIVE ? 1 : 0;
            const bInact = (b.status || "").toLowerCase() === HUB_STATUS.INACTIVE ? 1 : 0;
            if (aInact !== bInact) return aInact - bInact;
            return (a.code || "").localeCompare(b.code || "");
        });
        return [
            { value: "", label: "None (General Airspace)" },
            ...sorted.map((h) => ({
                value: h.id,
                label: h.name ? `${h.name} (${h.code || "HUB"})` : h.id,
            })),
        ];
    }, [hubs]);

    return (
        <div className="space-y-4">
            <AutoGenInput
                id="airspaceCode"
                label="Code"
                showAutoGen={!isEdit}
                disabled={isEdit}
                required={!isEdit}
                manualPlaceholder="e.g. ASZ-SGN01"
                value={formData.code ?? ""}
                onChange={(e) => {
                    onFormChange("code", e.target.value);
                    onClearFieldError("code");
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
                    onClearFieldError("name");
                }}
                error={fieldErrors.name}
            />

            <div className="form-group">
                <label className="form-label" htmlFor="airspaceZoneType">
                    Classification Type <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    id="airspaceZoneType"
                    value={formData.zoneType}
                    onValueChange={(val: string) => {
                        onFormChange("zoneType", val as AirspaceZoneType);
                        onClearFieldError("zoneType");
                    }}
                    options={ZONE_TYPE_OPTIONS}
                />
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="airspaceStatus">
                    Operational Status
                </label>
                <CustomSelect
                    id="airspaceStatus"
                    value={formData.status}
                    onValueChange={(val: string) => {
                        onFormChange("status", val as AirspaceZoneStatus);
                        onClearFieldError("status");
                    }}
                    options={ZONE_STATUS_OPTIONS}
                />
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="airspaceHub">
                    Associated Vertiport Hub
                </label>
                <CustomSelect
                    id="airspaceHub"
                    value={formData.hubId ?? ""}
                    onValueChange={(val: string) => {
                        onFormChange("hubId", val);
                        onClearFieldError("hubId");
                    }}
                    options={hubOptions}
                />
            </div>

            <div className="form-row-2">
                <FormInput
                    id="altitudeFloor"
                    label="Floor (m)"
                    type="number"
                    min={0}
                    max={4999}
                    className="font-mono"
                    value={formData.altitudeFloor ?? 0}
                    onChange={(e) => {
                        onFormChange("altitudeFloor", Number(e.target.value));
                        onClearFieldError("altitudeFloor");
                    }}
                    error={fieldErrors.altitudeFloor}
                />

                <FormInput
                    id="altitudeCeiling"
                    label="Ceiling (m)"
                    required
                    type="number"
                    min={10}
                    max={5000}
                    className="font-mono"
                    value={formData.altitudeCeiling ?? 120}
                    onChange={(e) => {
                        onFormChange("altitudeCeiling", Number(e.target.value));
                        onClearFieldError("altitudeCeiling");
                    }}
                    error={fieldErrors.altitudeCeiling}
                />
            </div>

            <div className="form-group">
                <label className="form-label">Effective Start (Optional)</label>
                <DateTimePicker
                    value={formData.effectiveStart ?? ""}
                    onChange={(val) => {
                        onFormChange("effectiveStart", val);
                        onClearFieldError("effectiveStart");
                    }}
                    placeholder="Select start date & time..."
                    error={Boolean(fieldErrors.effectiveStart)}
                />
                {fieldErrors.effectiveStart && (
                    <span className="form-error-msg">{fieldErrors.effectiveStart}</span>
                )}
            </div>

            <div className="form-group">
                <label className="form-label">Effective End (Optional)</label>
                <DateTimePicker
                    value={formData.effectiveEnd ?? ""}
                    onChange={(val) => {
                        onFormChange("effectiveEnd", val);
                        onClearFieldError("effectiveEnd");
                    }}
                    placeholder="Select end date & time..."
                    error={Boolean(fieldErrors.effectiveEnd)}
                />
                {fieldErrors.effectiveEnd && (
                    <span className="form-error-msg">{fieldErrors.effectiveEnd}</span>
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
                        onClearFieldError("description");
                    }}
                    placeholder="Enter legal basis, operational constraints, or activation schedule..."
                    className="form-input resize-none"
                />
            </div>
        </div>
    );
}
