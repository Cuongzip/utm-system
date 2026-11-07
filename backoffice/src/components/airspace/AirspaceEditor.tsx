"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, Loader2 } from "lucide-react";
import {
    SplitMapLayout,
    ChamferButton,
    OutlineButton,
    StatusBadge,
    ConfirmDialog,
} from "@/components/ui";
import { validateSchema, createFieldErrorCleaner } from "@/utils";
import { createZoneBody, updateZoneBody } from "@/generated/airspace";
import type {
    AirspaceZone,
    CreateAirspaceZonePayload,
    UpdateAirspaceZonePayload,
    Hub,
} from "@/types";
import { useAirspaceGeometry } from "./useAirspaceGeometry";
import { AirspaceMapEditor } from "./AirspaceMapEditor";
import { AirspaceFormSidebar, type AirspaceFormData } from "./AirspaceFormSidebar";

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

    const [formData, setFormData] = useState<AirspaceFormData>({
        code: initialData?.code || "",
        autoGen: mode === "create",
        name: initialData?.name || "",
        zoneType: initialData?.zoneType || "no_fly_zone",
        status: initialData?.status || "active",
        altitudeCeiling:
            initialData?.altitudeCeiling !== undefined ? initialData.altitudeCeiling : 120,
        hubId: initialData?.hubId || "",
        description: initialData?.description || "",
    });

    const [activeSidebarTab, setActiveSidebarTab] = useState<"details" | "geometry">("details");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const clearFieldError = createFieldErrorCleaner(setFieldErrors);

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
        if (initialData) {
            setFormData({
                code: initialData.code || "",
                autoGen: false,
                name: initialData.name || "",
                zoneType: initialData.zoneType || "no_fly_zone",
                status: initialData.status || "active",
                altitudeCeiling:
                    initialData.altitudeCeiling !== undefined ? initialData.altitudeCeiling : 120,
                hubId: initialData.hubId || "",
                description: initialData.description || "",
            });
        } else {
            setFormData((prev) => ({
                ...prev,
                code: "",
                autoGen: mode === "create",
            }));
        }
    }, [initialData, mode]);

    const handleFormChange = <K extends keyof AirspaceFormData>(
        field: K,
        value: AirspaceFormData[K]
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setFieldErrors({});

        const trimmedCode = formData.code?.trim();
        if (mode === "create" && !formData.autoGen && !trimmedCode) {
            setFieldErrors({ code: "Code is required when AUTO-GEN is disabled" });
            setActiveSidebarTab("details");
            return;
        }

        const payload = {
            ...(mode === "create"
                ? { code: formData.autoGen || !trimmedCode ? undefined : trimmedCode.toUpperCase() }
                : {}),
            name: formData.name.trim(),
            zoneType: formData.zoneType,
            status: formData.status,
            altitudeCeiling: Number(formData.altitudeCeiling),
            hubId: formData.hubId || undefined,
            description: formData.description.trim() || undefined,
            geometry: computedGeoJson ?? undefined,
        };

        const schema = mode === "create" ? createZoneBody : updateZoneBody;
        const validation = validateSchema(schema, payload);

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
                        <StatusBadge
                            status={formData.status === "active" ? "active" : "inactive"}
                            label={formData.status.toUpperCase()}
                        />
                    ) : null
                }
                headerActions={
                    <div className="flex items-center gap-3">
                        <OutlineButton
                            size="sm"
                            onClick={() => router.push("/dashboard/airspace")}
                            disabled={submitting || isDeleting}
                        >
                            <ArrowLeft className="w-3.5 h-3.5 text-[var(--color-border-dark)]" />
                            <span>Cancel</span>
                        </OutlineButton>

                        {mode === "edit" && onDelete && (
                            <OutlineButton
                                size="sm"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={submitting || isDeleting}
                                className="text-rose-500 hover:text-rose-600 hover:border-rose-400"
                            >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Delete</span>
                            </OutlineButton>
                        )}

                        <ChamferButton
                            variant="dark"
                            size="sm"
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

export default AirspaceEditor;
