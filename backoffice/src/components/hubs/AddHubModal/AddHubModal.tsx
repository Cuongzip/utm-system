"use client";

import { useState, useEffect } from "react";
import { Modal, CustomSelect, FormInput, CoordinatesInput } from "@/components/ui";
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
            <FormInput
                id="hubCode"
                label="Code"
                required
                disabled={!!hubToEdit}
                value={code}
                onChange={(e) => {
                    setCode(e.target.value);
                    clearFieldError("code");
                }}
                placeholder="e.g. HUB-001"
                error={fieldErrors.code}
            />

            <FormInput
                id="hubName"
                label="Name"
                required
                value={name}
                onChange={(e) => {
                    setName(e.target.value);
                    clearFieldError("name");
                }}
                placeholder="Hub name"
                error={fieldErrors.name}
            />

            <CoordinatesInput
                lat={lat}
                lng={lng}
                onLatChange={(v) => {
                    setLat(v);
                    clearFieldError("lat", "location.lat");
                }}
                onLngChange={(v) => {
                    setLng(v);
                    clearFieldError("lng", "location.lng");
                }}
                latError={fieldErrors.lat || fieldErrors["location.lat"]}
                lngError={fieldErrors.lng || fieldErrors["location.lng"]}
            />

            <div className="form-row-2">
                <FormInput
                    id="airspaceRadius"
                    label="Radius (m)"
                    required
                    type="number"
                    step="any"
                    value={airspaceRadius}
                    onChange={(e) => {
                        setAirspaceRadius(e.target.value);
                        clearFieldError("airspaceRadius");
                    }}
                    placeholder="5000"
                    error={fieldErrors.airspaceRadius}
                />

                <FormInput
                    id="altitudeMsl"
                    label="Ceiling / Altitude MSL (m)"
                    type="number"
                    step="any"
                    value={altitudeMsl}
                    onChange={(e) => {
                        setAltitudeMsl(e.target.value);
                        clearFieldError("altitudeMsl");
                    }}
                    placeholder="400"
                    error={fieldErrors.altitudeMsl}
                />
            </div>

            <div className="form-row-2">
                <FormInput
                    id="timezone"
                    label="Timezone"
                    type="text"
                    value={timezone}
                    onChange={(e) => {
                        setTimezone(e.target.value);
                        clearFieldError("timezone");
                    }}
                    placeholder="UTC"
                    error={fieldErrors.timezone}
                />

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
