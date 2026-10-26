"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Modal, CustomSelect } from "@/components/ui";
import {
    cn,
    parseApiError,
    validateSchema,
    parseFormNumber,
    createFieldErrorCleaner,
} from "@/utils";
import { createZoneBody, updateZoneBody } from "@/generated";
import type {
    AirspaceZone,
    CreateAirspaceZonePayload,
    UpdateAirspaceZonePayload,
    AirspaceZoneType,
    AirspaceZoneStatus,
    Hub,
} from "@/types";

interface AddAirspaceModalProps {
    isOpen: boolean;
    zoneToEdit?: AirspaceZone | null;
    hubs?: Hub[];
    onClose: () => void;
    onSubmit: (
        payload: CreateAirspaceZonePayload | UpdateAirspaceZonePayload,
        id?: string
    ) => Promise<void>;
}

const ZONE_TYPE_OPTIONS = createZoneBody.shape.zoneType.options;
const ZONE_STATUS_OPTIONS = updateZoneBody.shape.status.unwrap().options;

function generateCirclePolygon(centerLat: number, centerLng: number, radiusMeters: number) {
    const pointsCount = 32;
    const coordinates: [number, number][] = [];

    const latRad = (centerLat * Math.PI) / 180;
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLng = 111320 * Math.cos(latRad);

    for (let i = 0; i <= pointsCount; i++) {
        const angle = (i * 2 * Math.PI) / pointsCount;
        const dLat = (radiusMeters * Math.cos(angle)) / metersPerDegreeLat;
        const dLng = (radiusMeters * Math.sin(angle)) / metersPerDegreeLng;

        const pLat = Number((centerLat + dLat).toFixed(6));
        const pLng = Number((centerLng + dLng).toFixed(6));
        coordinates.push([pLng, pLat]);
    }

    return {
        type: "Polygon" as const,
        coordinates: [coordinates],
    };
}

export function AddAirspaceModal({
    isOpen,
    zoneToEdit,
    hubs = [],
    onClose,
    onSubmit,
}: AddAirspaceModalProps) {
    const [name, setName] = useState("");
    const [zoneType, setZoneType] = useState<AirspaceZoneType>("no_fly_zone");
    const [status, setStatus] = useState<AirspaceZoneStatus>("active");
    const [altitudeCeiling, setAltitudeCeiling] = useState("120");
    const [hubId, setHubId] = useState("");
    const [description, setDescription] = useState("");

    const [geometryMode, setGeometryMode] = useState<"radius" | "polygon">("radius");
    const [centerLat, setCenterLat] = useState("10.7769");
    const [centerLng, setCenterLng] = useState("106.7009");
    const [radiusMeters, setRadiusMeters] = useState("1000");
    const [polygonJson, setPolygonJson] = useState("");

    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const clearFieldError = createFieldErrorCleaner(setFieldErrors);

    useEffect(() => {
        if (isOpen) {
            if (zoneToEdit) {
                setName(zoneToEdit.name || "");
                setZoneType(zoneToEdit.zoneType || "no_fly_zone");
                setStatus(zoneToEdit.status || "active");
                setAltitudeCeiling(
                    zoneToEdit.altitudeCeiling !== undefined
                        ? String(zoneToEdit.altitudeCeiling)
                        : "120"
                );
                setHubId(zoneToEdit.hubId || "");
                setDescription(zoneToEdit.description || "");

                const coords = zoneToEdit.geometry?.coordinates;
                if (coords && coords.length > 0) {
                    setGeometryMode("polygon");
                    setPolygonJson(JSON.stringify(coords, null, 2));
                } else {
                    setGeometryMode("radius");
                    setPolygonJson("");
                }
            } else {
                setName("");
                setZoneType("no_fly_zone");
                setStatus("active");
                setAltitudeCeiling("120");
                setHubId("");
                setDescription("");
                setGeometryMode("radius");
                setCenterLat("10.7769");
                setCenterLng("106.7009");
                setRadiusMeters("1000");
                setPolygonJson("");
            }
            setFieldErrors({});
        }
    }, [isOpen, zoneToEdit]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        let geometry: { type: string; coordinates: number[][][] } | undefined;

        if (geometryMode === "radius") {
            const parsedLat = parseFormNumber(centerLat);
            const parsedLng = parseFormNumber(centerLng);
            const parsedRadius = parseFormNumber(radiusMeters);

            if (parsedLat === undefined || parsedLng === undefined || parsedRadius === undefined) {
                setFieldErrors((prev) => ({
                    ...prev,
                    geometry: "Please provide valid center latitude, longitude, and radius",
                }));
                return;
            }

            geometry = generateCirclePolygon(parsedLat, parsedLng, parsedRadius);
        } else {
            if (!polygonJson.trim()) {
                if (!zoneToEdit) {
                    setFieldErrors((prev) => ({
                        ...prev,
                        geometry: "Coordinates JSON is required",
                    }));
                    return;
                }
            } else {
                try {
                    const parsed = JSON.parse(polygonJson.trim());
                    if (!Array.isArray(parsed) || !Array.isArray(parsed[0])) {
                        throw new Error(
                            "Coordinates must be an array of rings: [[[lng, lat], ...]]"
                        );
                    }
                    geometry = {
                        type: "Polygon",
                        coordinates: parsed,
                    };
                } catch (err: any) {
                    setFieldErrors((prev) => ({
                        ...prev,
                        geometry: `Invalid GeoJSON coordinates: ${err.message || "Parse error"}`,
                    }));
                    return;
                }
            }
        }

        const schema = zoneToEdit ? updateZoneBody : createZoneBody;
        const validationData: any = {
            name: name.trim() || (zoneToEdit ? undefined : ""),
            hubId: hubId.trim() || undefined,
            zoneType,
            status,
            altitudeCeiling: parseFormNumber(altitudeCeiling) ?? (zoneToEdit ? undefined : 120),
            description: description.trim() || undefined,
            geometry,
        };

        const validation = validateSchema(schema, validationData);
        if (!validation.success) {
            setFieldErrors(validation.errors);
            return;
        }

        setLoading(true);
        try {
            await onSubmit(validationData, zoneToEdit?.id);
            onClose();
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to save airspace zone");
            if (Object.keys(parsed.fieldErrors).length > 0) {
                setFieldErrors(parsed.fieldErrors);
            } else {
                toast.error(parsed.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={zoneToEdit ? "Edit Airspace Sector" : "Register Airspace Sector"}
            onSubmit={handleSubmit}
            loading={loading}
            submitText={zoneToEdit ? "Update Zone" : "Create Zone"}
            loadingText={zoneToEdit ? "Updating..." : "Creating..."}
            maxWidth="560px"
        >
            <div className="flex flex-col gap-4">
                {fieldErrors.root && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-xs font-medium">
                        {fieldErrors.root}
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Zone Name *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            clearFieldError("name");
                        }}
                        placeholder="e.g. D1 Historic Sanctuary NFZ"
                        className={cn("form-input", fieldErrors.name && "form-input-error")}
                        disabled={loading}
                    />
                    {fieldErrors.name && <span className="form-error-msg">{fieldErrors.name}</span>}
                </div>

                <div className="form-row-2">
                    <div className="form-group">
                        <label className="form-label">Classification Type *</label>
                        <CustomSelect
                            value={zoneType}
                            onValueChange={(val) => {
                                const newType = val as AirspaceZoneType;
                                setZoneType(newType);
                                clearFieldError("zoneType");
                                if (newType === "hub_corridor") {
                                    setGeometryMode("polygon");
                                    if (!polygonJson.trim()) {
                                        setPolygonJson(
                                            JSON.stringify(
                                                [
                                                    [
                                                        [106.7009, 10.775],
                                                        [106.715, 10.778],
                                                        [106.735, 10.783],
                                                        [106.736, 10.787],
                                                        [106.714, 10.782],
                                                        [106.7, 10.778],
                                                        [106.7009, 10.775],
                                                    ],
                                                ],
                                                null,
                                                2
                                            )
                                        );
                                    }
                                }
                            }}
                            options={ZONE_TYPE_OPTIONS.map((type) => ({
                                value: type,
                                label: type.replace(/_/g, " ").toUpperCase(),
                            }))}
                            disabled={loading}
                            error={Boolean(fieldErrors.zoneType)}
                        />
                        {fieldErrors.zoneType && (
                            <span className="form-error-msg">{fieldErrors.zoneType}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Status *</label>
                        <CustomSelect
                            value={status}
                            onValueChange={(val) => {
                                setStatus(val as AirspaceZoneStatus);
                                clearFieldError("status");
                            }}
                            options={ZONE_STATUS_OPTIONS.map((st) => ({
                                value: st,
                                label: st.toUpperCase(),
                            }))}
                            disabled={loading}
                            error={Boolean(fieldErrors.status)}
                        />
                        {fieldErrors.status && (
                            <span className="form-error-msg">{fieldErrors.status}</span>
                        )}
                    </div>
                </div>

                <div className="form-row-2">
                    <div className="form-group">
                        <label className="form-label">Altitude Ceiling (m) *</label>
                        <input
                            type="number"
                            step="any"
                            value={altitudeCeiling}
                            onChange={(e) => {
                                setAltitudeCeiling(e.target.value);
                                clearFieldError("altitudeCeiling");
                            }}
                            placeholder="e.g. 120"
                            className={cn(
                                "form-input",
                                fieldErrors.altitudeCeiling && "form-input-error"
                            )}
                            disabled={loading}
                        />
                        {fieldErrors.altitudeCeiling && (
                            <span className="form-error-msg">{fieldErrors.altitudeCeiling}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Associated Vertiport Hub</label>
                        <CustomSelect
                            value={hubId}
                            onValueChange={(val) => {
                                setHubId(val);
                                clearFieldError("hubId");
                            }}
                            options={[
                                { value: "", label: "None (General Airspace)" },
                                ...hubs.map((hub) => ({
                                    value: hub.id,
                                    label: `${hub.name} (${hub.code})`,
                                })),
                            ]}
                            disabled={loading}
                            error={Boolean(fieldErrors.hubId)}
                        />
                        {fieldErrors.hubId && (
                            <span className="form-error-msg">{fieldErrors.hubId}</span>
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Operational Notes / Reason</label>
                    <textarea
                        rows={2}
                        value={description}
                        onChange={(e) => {
                            setDescription(e.target.value);
                            clearFieldError("description");
                        }}
                        placeholder="Regulatory reference, security requirement, or buffer details..."
                        className={cn("form-input", fieldErrors.description && "form-input-error")}
                        disabled={loading}
                    />
                    {fieldErrors.description && (
                        <span className="form-error-msg">{fieldErrors.description}</span>
                    )}
                </div>

                <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <span className="form-section-title">
                                {zoneType === "hub_corridor"
                                    ? "Flight Corridor Route Geometry"
                                    : "Spatial Boundary Geometry"}
                            </span>
                            {zoneType === "hub_corridor" && (
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Corridors require linear polygon boundaries along the flight
                                    route.
                                </p>
                            )}
                        </div>
                        {zoneType !== "hub_corridor" && (
                            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-[6px] border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setGeometryMode("radius")}
                                    className={cn(
                                        "px-2.5 py-1 text-xs font-semibold rounded-[4px] transition-colors",
                                        geometryMode === "radius"
                                            ? "bg-white text-slate-800 shadow-xs"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Circular Geofence
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGeometryMode("polygon")}
                                    className={cn(
                                        "px-2.5 py-1 text-xs font-semibold rounded-[4px] transition-colors",
                                        geometryMode === "polygon"
                                            ? "bg-white text-slate-800 shadow-xs"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Custom Coordinates
                                </button>
                            </div>
                        )}
                    </div>

                    {geometryMode === "radius" ? (
                        <div className="flex flex-col gap-3">
                            <div className="form-row-2">
                                <div className="form-group">
                                    <label className="form-label">Center Latitude *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={centerLat}
                                        onChange={(e) => {
                                            setCenterLat(e.target.value);
                                            clearFieldError("geometry");
                                        }}
                                        placeholder="10.7769"
                                        className="form-input font-mono"
                                        disabled={loading}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Center Longitude *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={centerLng}
                                        onChange={(e) => {
                                            setCenterLng(e.target.value);
                                            clearFieldError("geometry");
                                        }}
                                        placeholder="106.7009"
                                        className="form-input font-mono"
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Radius (meters) *</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={radiusMeters}
                                    onChange={(e) => {
                                        setRadiusMeters(e.target.value);
                                        clearFieldError("geometry");
                                    }}
                                    placeholder="1000"
                                    className="form-input font-mono"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="form-group">
                            <label className="form-label">GeoJSON Linear Ring Coordinates</label>
                            <textarea
                                rows={4}
                                value={polygonJson}
                                onChange={(e) => {
                                    setPolygonJson(e.target.value);
                                    clearFieldError("geometry");
                                }}
                                placeholder="[[[106.70, 10.77], [106.71, 10.77], [106.71, 10.78], [106.70, 10.77]]]"
                                className={cn(
                                    "form-input font-mono text-xs leading-relaxed",
                                    fieldErrors.geometry && "form-input-error"
                                )}
                                disabled={loading}
                            />
                        </div>
                    )}

                    {fieldErrors.geometry && (
                        <span className="form-error-msg mt-2">{fieldErrors.geometry}</span>
                    )}
                </div>
            </div>
        </Modal>
    );
}

export default AddAirspaceModal;
