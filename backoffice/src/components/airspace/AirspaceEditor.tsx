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
    AirspaceZoneType,
    AirspaceZoneStatus,
    CreateAirspaceZonePayload,
    UpdateAirspaceZonePayload,
    Hub,
} from "@/types";
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

    const [name, setName] = useState(initialData?.name || "");
    const [zoneType, setZoneType] = useState<AirspaceZoneType>(
        initialData?.zoneType || "no_fly_zone"
    );
    const [status, setStatus] = useState<AirspaceZoneStatus>(initialData?.status || "active");
    const [altitudeCeiling, setAltitudeCeiling] = useState<number>(
        initialData?.altitudeCeiling !== undefined ? initialData.altitudeCeiling : 120
    );
    const [hubId, setHubId] = useState<string>(initialData?.hubId || "");
    const [description, setDescription] = useState<string>(initialData?.description || "");

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
            setName(initialData.name || "");
            setZoneType(initialData.zoneType || "no_fly_zone");
            setStatus(initialData.status || "active");
            setAltitudeCeiling(
                initialData.altitudeCeiling !== undefined ? initialData.altitudeCeiling : 120
            );
            setHubId(initialData.hubId || "");
            setDescription(initialData.description || "");
        }
    }, [initialData]);

    const handleSave = async () => {
        setFieldErrors({});

        const payload = {
            name: name.trim(),
            zoneType,
            status,
            altitudeCeiling: Number(altitudeCeiling),
            hubId: hubId || undefined,
            description: description.trim() || undefined,
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
                            status={status === "active" ? "active" : "inactive"}
                            label={status.toUpperCase()}
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
                        zoneType={zoneType}
                        altitudeCeiling={altitudeCeiling}
                        existingZones={existingZones}
                        currentZoneId={initialData?.id}
                        className="h-full"
                    />
                }
                sidebarContent={
                    <AirspaceFormSidebar
                        name={name}
                        onNameChange={setName}
                        zoneType={zoneType}
                        onZoneTypeChange={setZoneType}
                        status={status}
                        onStatusChange={setStatus}
                        altitudeCeiling={altitudeCeiling}
                        onAltitudeCeilingChange={setAltitudeCeiling}
                        hubId={hubId}
                        onHubIdChange={setHubId}
                        description={description}
                        onDescriptionChange={setDescription}
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
                        computedGeoJson={computedGeoJson}
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
                description={`Are you sure you want to delete zone "${name}"? This action will deactivate and remove this airspace sector.`}
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
