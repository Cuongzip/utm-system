"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, Loader2 } from "lucide-react";
import { SplitMapLayout, ChamferButton, StatusBadge, ConfirmDialog } from "@/components/ui";
import { validateSchema, clearFieldError as clearFields, parseApiError } from "@/utils";
import { createZoneBody, updateZoneBody } from "@/generated/airspace";
import type {
    AirspaceZone,
    CreateAirspaceZonePayload,
    UpdateAirspaceZonePayload,
    AirspaceZoneFormPayload,
    Hub,
} from "@/types";
import { getInitialAirspaceFormPayload, DEFAULT_AIRSPACE_ZONE_STATUS } from "@/types";
import { useAirspaceGeometry } from "./useAirspaceGeometry";
import { AirspaceMapEditor } from "./AirspaceMapEditor";
import { AirspaceFormSidebar } from "./AirspaceFormSidebar";

export interface AirspaceEditorProps {
    mode: "create" | "edit";
    initialData?: AirspaceZone | null;
    hubs?: Hub[];
    existingZones?: AirspaceZone[];
    onSave: (payload: CreateAirspaceZonePayload | UpdateAirspaceZonePayload) => Promise<void>;
    onDelete?: () => Promise<void>;
    loading?: boolean;
}

export function AirspaceEditor({
    mode,
    initialData,
    hubs = [],
    existingZones = [],
    onSave,
    onDelete,
    loading = false,
}: AirspaceEditorProps) {
    const router = useRouter();

    const [submitting, setSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [formData, setFormData] = useState<AirspaceZoneFormPayload>(() =>
        getInitialAirspaceFormPayload(initialData)
    );

    const [activeSidebarTab, setActiveSidebarTab] = useState<"details" | "geometry">("details");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const clearFieldError = (...fields: string[]) => clearFields(setFieldErrors, ...fields);

    const {
        geometryMode,
        setGeometryMode,
        center,
        setCenter,
        radiusMeters,
        setRadiusMeters,
        polygonPoints,
        addPolygonPoint,
        removePolygonPoint,
        undoPolygonPoint,
        clearPolygonPoints,
        computedGeoJson,
    } = useAirspaceGeometry(initialData?.geometry);

    useEffect(() => {
        setFormData(getInitialAirspaceFormPayload(initialData));
    }, [initialData]);

    const handleFormChange = <K extends keyof AirspaceZoneFormPayload>(
        field: K,
        value: AirspaceZoneFormPayload[K]
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setFieldErrors({});

        const payload = {
            ...(mode === "create" ? { code: formData.code?.toUpperCase() } : {}),
            name: (formData.name ?? "").trim(),
            zoneType: formData.zoneType,
            status: formData.status,
            altitudeCeiling: Number(formData.altitudeCeiling),
            hubId: formData.hubId || undefined,
            description: formData.description?.trim() || undefined,
            geometry: computedGeoJson ?? undefined,
        };

        const schema = mode === "create" ? createZoneBody : updateZoneBody;
        const validation = validateSchema<CreateAirspaceZonePayload | UpdateAirspaceZonePayload>(
            schema,
            payload
        );

        if (!validation.success) {
            setFieldErrors(validation.errors);
            if (validation.errors.geometry || validation.errors["geometry.coordinates"]) {
                setActiveSidebarTab("geometry");
            } else {
                setActiveSidebarTab("details");
            }
            return;
        }

        setSubmitting(true);
        try {
            await onSave(validation.data as CreateAirspaceZonePayload | UpdateAirspaceZonePayload);
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to save airspace zone");
            if (Object.keys(parsed.fieldErrors).length > 0) {
                setFieldErrors((prev) => ({ ...prev, ...parsed.fieldErrors }));
                if (parsed.fieldErrors.geometry || parsed.fieldErrors["geometry.coordinates"]) {
                    setActiveSidebarTab("geometry");
                } else {
                    setActiveSidebarTab("details");
                }
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        setIsDeleting(true);
        try {
            await onDelete();
            setShowDeleteConfirm(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const pageTitle =
        mode === "create" ? "NEW AIRSPACE ZONE" : `EDIT ZONE: ${initialData?.name || "AIRSPACE"}`;

    return (
        <>
            <SplitMapLayout
                title={pageTitle}
                badges={
                    mode === "edit" ? (
                        <StatusBadge status={formData.status ?? DEFAULT_AIRSPACE_ZONE_STATUS} />
                    ) : null
                }
                headerActions={
                    <div className="flex items-center gap-3">
                        <ChamferButton
                            variant="outline"
                            size="sm"
                            clip="xs"
                            onClick={() => router.push("/dashboard/airspace")}
                            disabled={submitting || isDeleting}
                        >
                            <ArrowLeft className="w-3.5 h-3.5 text-[var(--color-border-dark)]" />
                            <span>Cancel</span>
                        </ChamferButton>

                        {mode === "edit" && onDelete && (
                            <ChamferButton
                                variant="outline"
                                size="sm"
                                clip="xs"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={submitting || isDeleting}
                            >
                                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Delete</span>
                            </ChamferButton>
                        )}

                        <ChamferButton
                            variant="dark"
                            size="sm"
                            clip="sm"
                            onClick={handleSave}
                            disabled={submitting || isDeleting || loading}
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                            ) : (
                                <Save className="w-4 h-4 text-white" />
                            )}
                            <span>{mode === "create" ? "Save Airspace Zone" : "Update Zone"}</span>
                        </ChamferButton>
                    </div>
                }
                mapContent={
                    <AirspaceMapEditor
                        geometryMode={geometryMode}
                        onGeometryModeChange={setGeometryMode}
                        center={center}
                        onCenterChange={(lat, lng) => {
                            setCenter(lat, lng);
                            clearFieldError("geometry", "geometry.coordinates");
                        }}
                        radiusMeters={radiusMeters}
                        polygonPoints={polygonPoints}
                        onAddPolygonPoint={(lat, lng) => {
                            addPolygonPoint(lat, lng);
                            clearFieldError("geometry", "geometry.coordinates");
                        }}
                        onUndoPolygonPoint={undoPolygonPoint}
                        onClearPolygonPoints={clearPolygonPoints}
                        zoneType={formData.zoneType}
                        altitudeCeiling={formData.altitudeCeiling}
                        existingZones={existingZones}
                        currentZoneId={initialData?.id}
                        className="h-full"
                    />
                }
                sidebarContent={
                    <AirspaceFormSidebar
                        formData={formData}
                        onFormChange={handleFormChange}
                        isEdit={mode === "edit"}
                        hubs={hubs}
                        geometryMode={geometryMode}
                        onGeometryModeChange={setGeometryMode}
                        center={center}
                        onCenterChange={(lat, lng) => {
                            setCenter(lat, lng);
                            clearFieldError("geometry", "geometry.coordinates");
                        }}
                        radiusMeters={radiusMeters}
                        onRadiusChange={(r) => {
                            setRadiusMeters(r);
                            clearFieldError("geometry", "geometry.coordinates");
                        }}
                        polygonPoints={polygonPoints}
                        onRemovePolygonPoint={removePolygonPoint}
                        onClearPolygonPoints={clearPolygonPoints}
                        activeTab={activeSidebarTab}
                        onTabChange={setActiveSidebarTab}
                        fieldErrors={fieldErrors}
                        onClearFieldError={clearFieldError}
                        className="h-full"
                    />
                }
            />

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Airspace Zone"
                description={`Are you sure you want to delete zone "${formData.name}"? This action will deactivate and remove this airspace sector.`}
                confirmText="Delete Zone"
                variant="danger"
                loading={isDeleting}
                onConfirm={handleDelete}
                onClose={() => setShowDeleteConfirm(false)}
            />
        </>
    );
}
