"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui";
import { hubService } from "@/services/hubService";
import {
    cn,
    parseApiError,
    validateSchema,
    parseFormNumber,
    createFieldErrorCleaner,
} from "@/utils";
import { createDroneBody } from "@/generated";
import type { Drone, DroneRegistrationPayload, Hub } from "@/types";

interface RegisterDroneModalProps {
    isOpen: boolean;
    droneToEdit?: Drone | null;
    onClose: () => void;
    onSubmit: (payload: DroneRegistrationPayload, id?: string) => Promise<void>;
}

export function RegisterDroneModal({
    isOpen,
    droneToEdit,
    onClose,
    onSubmit,
}: RegisterDroneModalProps) {
    const [registrationNumber, setRegistrationNumber] = useState("");
    const [manufacturer, setManufacturer] = useState("");
    const [model, setModel] = useState("");
    const [homeHubId, setHomeHubId] = useState("");
    const [batteryCapacityWh, setBatteryCapacityWh] = useState("");
    const [maxPayload, setMaxPayload] = useState("");
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const clearFieldError = createFieldErrorCleaner(setFieldErrors);

    useEffect(() => {
        if (isOpen) {
            const fetchHubs = async () => {
                try {
                    const items = await hubService.getAll();
                    setHubs(items || []);
                } catch {
                    setHubs([]);
                }
            };
            fetchHubs();

            if (droneToEdit) {
                setRegistrationNumber(droneToEdit.registrationNumber || droneToEdit.id || "");
                setManufacturer(droneToEdit.manufacturer || "");
                setModel(droneToEdit.model || "");
                setHomeHubId(droneToEdit.homeHubId || droneToEdit.homeHub?.id || "");
                setBatteryCapacityWh(
                    droneToEdit.batteryCapacityWh ? String(droneToEdit.batteryCapacityWh) : ""
                );
                setMaxPayload(droneToEdit.maxPayload ? String(droneToEdit.maxPayload) : "");
            } else {
                setRegistrationNumber("");
                setManufacturer("");
                setModel("");
                setHomeHubId("");
                setBatteryCapacityWh("");
                setMaxPayload("");
            }
            setFieldErrors({});
        }
    }, [isOpen, droneToEdit]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const payload = {
            registrationNumber: registrationNumber.trim(),
            manufacturer: manufacturer.trim(),
            model: model.trim(),
            homeHubId: homeHubId ? homeHubId.trim() : undefined,
            batteryCapacityWh: parseFormNumber(batteryCapacityWh) as number,
            maxPayload: parseFormNumber(maxPayload) as number,
        };

        const validation = validateSchema(createDroneBody, payload);

        if (!validation.success) {
            setFieldErrors(validation.errors);
            return;
        }

        try {
            setLoading(true);
            setFieldErrors({});
            await onSubmit(validation.data as DroneRegistrationPayload, droneToEdit?.id);
            onClose();
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to register drone");
            setFieldErrors(parsed.fieldErrors);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={droneToEdit ? "Edit Drone" : "Register Drone"}
            onSubmit={handleSubmit}
            loading={loading}
            submitText={droneToEdit ? "Save Changes" : "Register Drone"}
            loadingText="Saving..."
        >
            <div className="form-group">
                <label className="form-label" htmlFor="registrationNumber">
                    Registration Number *
                </label>
                <input
                    id="registrationNumber"
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => {
                        setRegistrationNumber(e.target.value);
                        clearFieldError("registrationNumber");
                    }}
                    placeholder="e.g. DRN-001"
                    className={cn(
                        "form-input",
                        fieldErrors.registrationNumber && "form-input-error"
                    )}
                />
                {fieldErrors.registrationNumber && (
                    <span className="form-error-msg">{fieldErrors.registrationNumber}</span>
                )}
            </div>

            <div className="form-row-2">
                <div className="form-group">
                    <label className="form-label" htmlFor="manufacturer">
                        Manufacturer *
                    </label>
                    <input
                        id="manufacturer"
                        type="text"
                        value={manufacturer}
                        onChange={(e) => {
                            setManufacturer(e.target.value);
                            clearFieldError("manufacturer");
                        }}
                        placeholder="e.g. DJI"
                        className={cn("form-input", fieldErrors.manufacturer && "form-input-error")}
                    />
                    {fieldErrors.manufacturer && (
                        <span className="form-error-msg">{fieldErrors.manufacturer}</span>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="model">
                        Model *
                    </label>
                    <input
                        id="model"
                        type="text"
                        value={model}
                        onChange={(e) => {
                            setModel(e.target.value);
                            clearFieldError("model");
                        }}
                        placeholder="e.g. Matrice 300 RTK"
                        className={cn("form-input", fieldErrors.model && "form-input-error")}
                    />
                    {fieldErrors.model && (
                        <span className="form-error-msg">{fieldErrors.model}</span>
                    )}
                </div>
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="homeHub">
                    Home Hub
                </label>
                <select
                    id="homeHub"
                    value={homeHubId}
                    onChange={(e) => {
                        setHomeHubId(e.target.value);
                        clearFieldError("homeHubId");
                    }}
                    className={cn("form-select", fieldErrors.homeHubId && "form-input-error")}
                >
                    <option value="">Select a hub</option>
                    {hubs.map((h) => (
                        <option key={h.id} value={h.id}>
                            {h.name} {h.code ? `(${h.code})` : ""}
                        </option>
                    ))}
                </select>
                {fieldErrors.homeHubId && (
                    <span className="form-error-msg">{fieldErrors.homeHubId}</span>
                )}
            </div>

            <div className="form-row-2">
                <div className="form-group">
                    <label className="form-label" htmlFor="batteryCapacityWh">
                        Battery Capacity (Wh) *
                    </label>
                    <input
                        id="batteryCapacityWh"
                        type="number"
                        step="any"
                        value={batteryCapacityWh}
                        onChange={(e) => {
                            setBatteryCapacityWh(e.target.value);
                            clearFieldError("batteryCapacityWh");
                        }}
                        placeholder="e.g. 300"
                        className={cn(
                            "form-input",
                            fieldErrors.batteryCapacityWh && "form-input-error"
                        )}
                    />
                    {fieldErrors.batteryCapacityWh && (
                        <span className="form-error-msg">{fieldErrors.batteryCapacityWh}</span>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="maxPayload">
                        Max Payload (kg) *
                    </label>
                    <input
                        id="maxPayload"
                        type="number"
                        step="any"
                        value={maxPayload}
                        onChange={(e) => {
                            setMaxPayload(e.target.value);
                            clearFieldError("maxPayload");
                        }}
                        placeholder="e.g. 5"
                        className={cn("form-input", fieldErrors.maxPayload && "form-input-error")}
                    />
                    {fieldErrors.maxPayload && (
                        <span className="form-error-msg">{fieldErrors.maxPayload}</span>
                    )}
                </div>
            </div>
        </Modal>
    );
}

export default RegisterDroneModal;
