"use client";

import { useMemo } from "react";
import { CustomSelect, FormInput, AutoGenInput, type SelectOption } from "@/components/ui";
import { cn } from "@/lib";
import {
    type AirspaceZoneType,
    type AirspaceZoneStatus,
    type AirspaceZoneFormPayload,
    type Hub,
    AIRSPACE_ZONE_TYPES,
    AIRSPACE_ZONE_STATUSES,
    AIRSPACE_ZONE_TYPE_LABELS,
    AIRSPACE_ZONE_STATUS_LABELS,
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

    return (
        <div className="space-y-4">
            <AutoGenInput
                id="airspaceCode"
                label="Code"
                showAutoGen={!isEdit}
                disabled={isEdit}
                required
                manualPlaceholder="e.g. ASZ-SGN01"
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

            <FormInput
                id="altitudeCeiling"
                label="Altitude Ceiling Limit (m)"
                required
                type="number"
                min={10}
                max={5000}
                className="font-mono"
                value={formData.altitudeCeiling ?? 120}
                onChange={(e) => {
                    onFormChange("altitudeCeiling", Number(e.target.value));
                    onClearFieldError?.("altitudeCeiling");
                }}
                error={fieldErrors.altitudeCeiling}
            />

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
