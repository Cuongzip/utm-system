"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
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

export function AirspaceDetailsTab({
    formData,
    onFormChange,
    isEdit = false,
    hubs = [],
    fieldErrors = {},
    onClearFieldError,
}: AirspaceDetailsTabProps) {
    const t = useTranslations("airspace");

    const zoneTypeOptions: SelectOption[] = useMemo(
        () =>
            AIRSPACE_ZONE_TYPES.map((type) => ({
                value: type,
                label: t.has(`zoneTypes.${type}`)
                    ? t(`zoneTypes.${type}`)
                    : AIRSPACE_ZONE_TYPE_LABELS[type] || type,
            })),
        [t]
    );

    const zoneStatusOptions: SelectOption[] = useMemo(
        () =>
            AIRSPACE_ZONE_STATUSES.map((status) => ({
                value: status,
                label: t.has(`zoneStatuses.${status}`)
                    ? t(`zoneStatuses.${status}`)
                    : AIRSPACE_ZONE_STATUS_LABELS[status] || status,
            })),
        [t]
    );

    const hubOptions: SelectOption[] = useMemo(() => {
        const sorted = [...hubs].sort((a, b) => {
            const aInact = (a.status || "").toLowerCase() === HUB_STATUS.INACTIVE ? 1 : 0;
            const bInact = (b.status || "").toLowerCase() === HUB_STATUS.INACTIVE ? 1 : 0;
            if (aInact !== bInact) return aInact - bInact;
            return (a.code || "").localeCompare(b.code || "");
        });
        return [
            { value: "", label: t("editor.noneGeneral") },
            ...sorted.map((h) => ({
                value: h.id,
                label: h.name ? `${h.name} (${h.code || "HUB"})` : h.id,
            })),
        ];
    }, [hubs, t]);

    return (
        <div className="space-y-4">
            <AutoGenInput
                id="airspaceCode"
                label={t("editor.codeLabel")}
                showAutoGen={!isEdit}
                disabled={isEdit}
                required={!isEdit}
                manualPlaceholder={t("editor.codePlaceholder")}
                value={formData.code ?? ""}
                onChange={(e) => {
                    onFormChange("code", e.target.value);
                    onClearFieldError("code");
                }}
                error={fieldErrors.code}
            />

            <FormInput
                id="airspaceName"
                label={t("editor.nameLabel")}
                required
                placeholder={t("editor.namePlaceholder")}
                value={formData.name}
                onChange={(e) => {
                    onFormChange("name", e.target.value);
                    onClearFieldError("name");
                }}
                error={fieldErrors.name}
            />

            <div className="form-group">
                <label className="form-label" htmlFor="airspaceZoneType">
                    {t("editor.typeLabel")} <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    id="airspaceZoneType"
                    value={formData.zoneType}
                    onValueChange={(val: string) => {
                        onFormChange("zoneType", val as AirspaceZoneType);
                        onClearFieldError("zoneType");
                    }}
                    options={zoneTypeOptions}
                />
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="airspaceStatus">
                    {t("editor.statusLabel")}
                </label>
                <CustomSelect
                    id="airspaceStatus"
                    value={formData.status}
                    onValueChange={(val: string) => {
                        onFormChange("status", val as AirspaceZoneStatus);
                        onClearFieldError("status");
                    }}
                    options={zoneStatusOptions}
                />
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="airspaceHub">
                    {t("editor.hubLabel")}
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
                    label={t("editor.floorLabel")}
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
                    label={t("editor.ceilingLabel")}
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
                <label className="form-label">{t("editor.startLabel")}</label>
                <DateTimePicker
                    value={formData.effectiveStart ?? ""}
                    onChange={(val) => {
                        onFormChange("effectiveStart", val);
                        onClearFieldError("effectiveStart");
                    }}
                    placeholder={t("editor.startPlaceholder")}
                    error={Boolean(fieldErrors.effectiveStart)}
                />
                {fieldErrors.effectiveStart && (
                    <span className="form-error-msg">{fieldErrors.effectiveStart}</span>
                )}
            </div>

            <div className="form-group">
                <label className="form-label">{t("editor.endLabel")}</label>
                <DateTimePicker
                    value={formData.effectiveEnd ?? ""}
                    onChange={(val) => {
                        onFormChange("effectiveEnd", val);
                        onClearFieldError("effectiveEnd");
                    }}
                    placeholder={t("editor.endPlaceholder")}
                    error={Boolean(fieldErrors.effectiveEnd)}
                />
                {fieldErrors.effectiveEnd && (
                    <span className="form-error-msg">{fieldErrors.effectiveEnd}</span>
                )}
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="zoneDesc">
                    {t("editor.descLabel")}
                </label>
                <textarea
                    id="zoneDesc"
                    rows={3}
                    value={formData.description ?? ""}
                    onChange={(e) => {
                        onFormChange("description", e.target.value);
                        onClearFieldError("description");
                    }}
                    placeholder={t("editor.descPlaceholder")}
                    className="form-input resize-none"
                />
            </div>
        </div>
    );
}
