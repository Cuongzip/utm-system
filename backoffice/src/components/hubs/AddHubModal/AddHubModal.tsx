"use client";

import { useState, useEffect } from "react";
import { Modal, CustomSelect } from "@/components/ui";
import {
    cn,
    parseApiError,
    validateSchema,
    parseFormNumber,
    createFieldErrorCleaner,
} from "@/utils";
import { createHubBody, updateHubBody } from "@/generated";
import type { Hub, CreateHubPayload, UpdateHubPayload, HubStatus } from "@/types";

interface AddHubModalProps {
    isOpen: boolean;
    hubToEdit?: Hub | null;
    onClose: () => void;
    onSubmit: (payload: CreateHubPayload | UpdateHubPayload, id?: string) => Promise<void>;
}

const HUB_STATUS_OPTIONS = updateHubBody.shape.status.unwrap().options;

export function AddHubModal({ isOpen, hubToEdit, onClose, onSubmit }: AddHubModalProps) {
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [airspaceRadius, setAirspaceRadius] = useState("");
    const [altitudeMsl, setAltitudeMsl] = useState("");
    const [timezone, setTimezone] = useState("UTC");
    const [status, setStatus] = useState<HubStatus>(HUB_STATUS_OPTIONS[0]);
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const clearFieldError = createFieldErrorCleaner(setFieldErrors);

    useEffect(() => {
        if (isOpen) {
            if (hubToEdit) {
                setCode(hubToEdit.code || "");
                setName(hubToEdit.name || "");
                const hubLat = hubToEdit.location?.lat;
                const hubLng = hubToEdit.location?.lng;
                setLat(hubLat !== undefined ? String(hubLat) : "");
                setLng(hubLng !== undefined ? String(hubLng) : "");
                setAirspaceRadius(
                    hubToEdit.airspaceRadius !== undefined
                        ? String(hubToEdit.airspaceRadius)
                        : "5000"
                );
                setAltitudeMsl(
                    hubToEdit.altitudeMsl !== undefined ? String(hubToEdit.altitudeMsl) : "400"
                );
                const matchedStatus = HUB_STATUS_OPTIONS.find(
                    (s) => s.toLowerCase() === hubToEdit.status?.toLowerCase()
                );
                setStatus(matchedStatus || HUB_STATUS_OPTIONS[0]);
                setTimezone("UTC");
            } else {
                setCode("");
                setName("");
                setLat("");
                setLng("");
                setAirspaceRadius("5000");
                setAltitudeMsl("400");
                setTimezone("UTC");
                setStatus(HUB_STATUS_OPTIONS[0]);
            }
            setFieldErrors({});
        }
    }, [isOpen, hubToEdit]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const schema = hubToEdit ? updateHubBody : createHubBody;
        const validationData = hubToEdit
            ? {
                  name: name.trim() || undefined,
                  airspaceRadius: parseFormNumber(airspaceRadius),
                  altitudeMsl: parseFormNumber(altitudeMsl),
                  status,
              }
            : {
                  code: code.trim().toUpperCase(),
                  name: name.trim(),
                  location: {
                      lat: parseFormNumber(lat) as number,
                      lng: parseFormNumber(lng) as number,
                  },
                  altitudeMsl: parseFormNumber(altitudeMsl) as number,
                  airspaceRadius: parseFormNumber(airspaceRadius) as number,
              };

        const validation = validateSchema(schema, validationData);

        if (!validation.success) {
            setFieldErrors(validation.errors);
            return;
        }

        try {
            setLoading(true);
            setFieldErrors({});

            if (hubToEdit) {
                await onSubmit(validation.data as UpdateHubPayload, hubToEdit.id);
            } else {
                await onSubmit(validation.data as CreateHubPayload);
            }
            onClose();
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to save hub");
            setFieldErrors(parsed.fieldErrors);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={hubToEdit ? "Edit Hub" : "Add Hub"}
            onSubmit={handleSubmit}
            loading={loading}
            submitText={hubToEdit ? "Save Changes" : "Create Hub"}
            loadingText={hubToEdit ? "Saving..." : "Creating..."}
        >
            <div className="form-group">
                <label className="form-label" htmlFor="hubCode">
                    Code *
                </label>
                <input
                    id="hubCode"
                    type="text"
                    disabled={!!hubToEdit}
                    value={code}
                    onChange={(e) => {
                        setCode(e.target.value);
                        clearFieldError("code");
                    }}
                    placeholder="e.g. HUB-001"
                    className={cn("form-input", fieldErrors.code && "form-input-error")}
                />
                {fieldErrors.code && <span className="form-error-msg">{fieldErrors.code}</span>}
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="hubName">
                    Name *
                </label>
                <input
                    id="hubName"
                    type="text"
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        clearFieldError("name");
                    }}
                    placeholder="Hub name"
                    className={cn("form-input", fieldErrors.name && "form-input-error")}
                />
                {fieldErrors.name && <span className="form-error-msg">{fieldErrors.name}</span>}
            </div>

            <div className="form-row-2">
                <div className="form-group">
                    <label className="form-label" htmlFor="latitude">
                        Latitude *
                    </label>
                    <input
                        id="latitude"
                        type="number"
                        step="any"
                        value={lat}
                        onChange={(e) => {
                            setLat(e.target.value);
                            clearFieldError("lat", "location.lat");
                        }}
                        placeholder="e.g. 37.9838"
                        className={cn(
                            "form-input",
                            (fieldErrors.lat || fieldErrors["location.lat"]) && "form-input-error"
                        )}
                    />
                    {(fieldErrors.lat || fieldErrors["location.lat"]) && (
                        <span className="form-error-msg">
                            {fieldErrors.lat || fieldErrors["location.lat"]}
                        </span>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="longitude">
                        Longitude *
                    </label>
                    <input
                        id="longitude"
                        type="number"
                        step="any"
                        value={lng}
                        onChange={(e) => {
                            setLng(e.target.value);
                            clearFieldError("lng", "location.lng");
                        }}
                        placeholder="e.g. 23.7275"
                        className={cn(
                            "form-input",
                            (fieldErrors.lng || fieldErrors["location.lng"]) && "form-input-error"
                        )}
                    />
                    {(fieldErrors.lng || fieldErrors["location.lng"]) && (
                        <span className="form-error-msg">
                            {fieldErrors.lng || fieldErrors["location.lng"]}
                        </span>
                    )}
                </div>
            </div>

            <div className="form-row-2">
                <div className="form-group">
                    <label className="form-label" htmlFor="airspaceRadius">
                        Radius (m) *
                    </label>
                    <input
                        id="airspaceRadius"
                        type="number"
                        step="any"
                        value={airspaceRadius}
                        onChange={(e) => {
                            setAirspaceRadius(e.target.value);
                            clearFieldError("airspaceRadius");
                        }}
                        placeholder="5000"
                        className={cn(
                            "form-input",
                            fieldErrors.airspaceRadius && "form-input-error"
                        )}
                    />
                    {fieldErrors.airspaceRadius && (
                        <span className="form-error-msg">{fieldErrors.airspaceRadius}</span>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="altitudeMsl">
                        Ceiling / Altitude MSL (m)
                    </label>
                    <input
                        id="altitudeMsl"
                        type="number"
                        step="any"
                        value={altitudeMsl}
                        onChange={(e) => {
                            setAltitudeMsl(e.target.value);
                            clearFieldError("altitudeMsl");
                        }}
                        placeholder="400"
                        className={cn("form-input", fieldErrors.altitudeMsl && "form-input-error")}
                    />
                    {fieldErrors.altitudeMsl && (
                        <span className="form-error-msg">{fieldErrors.altitudeMsl}</span>
                    )}
                </div>
            </div>

            <div className="form-row-2">
                <div className="form-group">
                    <label className="form-label" htmlFor="timezone">
                        Timezone
                    </label>
                    <input
                        id="timezone"
                        type="text"
                        value={timezone}
                        onChange={(e) => {
                            setTimezone(e.target.value);
                            clearFieldError("timezone");
                        }}
                        placeholder="UTC"
                        className={cn("form-input", fieldErrors.timezone && "form-input-error")}
                    />
                    {fieldErrors.timezone && (
                        <span className="form-error-msg">{fieldErrors.timezone}</span>
                    )}
                </div>

                {hubToEdit && (
                    <div className="form-group">
                        <label className="form-label" htmlFor="status">
                            Status
                        </label>
                        <CustomSelect
                            value={status}
                            onValueChange={(val) => {
                                setStatus(val as HubStatus);
                                clearFieldError("status");
                            }}
                            options={HUB_STATUS_OPTIONS.map((opt) => ({
                                value: opt,
                                label: opt.toUpperCase(),
                            }))}
                            error={Boolean(fieldErrors.status)}
                        />
                        {fieldErrors.status && (
                            <span className="form-error-msg">{fieldErrors.status}</span>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default AddHubModal;
