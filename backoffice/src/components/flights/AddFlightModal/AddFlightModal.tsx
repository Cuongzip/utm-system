"use client";

import { useState, useEffect } from "react";
import { Modal, CustomSelect } from "@/components/ui";
import type { Flight, Drone, Hub } from "@/types";

export interface AddFlightModalProps {
    isOpen: boolean;
    drones?: Drone[];
    hubs?: Hub[];
    onClose: () => void;
    onSubmit: (payload: Partial<Flight>) => Promise<void>;
}

export function AddFlightModal({
    isOpen,
    drones = [],
    hubs = [],
    onClose,
    onSubmit,
}: AddFlightModalProps) {
    const [flightNumber, setFlightNumber] = useState("");
    const [droneId, setDroneId] = useState("");
    const [departureHubId, setDepartureHubId] = useState("");
    const [arrivalHubId, setArrivalHubId] = useState("");
    const [scheduledDeparture, setScheduledDeparture] = useState("");
    const [scheduledArrival, setScheduledArrival] = useState("");
    const [cruisingAltitudeM, setCruisingAltitudeM] = useState("120");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFlightNumber("");
            setDroneId(drones[0]?.id || "");
            setDepartureHubId(hubs[0]?.id || "");
            setArrivalHubId(hubs[1]?.id || hubs[0]?.id || "");

            const now = new Date();
            const depTime = new Date(now.getTime() + 30 * 60 * 1000);
            const arrTime = new Date(now.getTime() + 90 * 60 * 1000);

            setScheduledDeparture(depTime.toISOString().slice(0, 16));
            setScheduledArrival(arrTime.toISOString().slice(0, 16));
            setCruisingAltitudeM("120");
            setNotes("");
            setError(null);
        }
    }, [isOpen, drones, hubs]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        if (!droneId) {
            setError("Please select an assigned drone");
            return;
        }

        if (!departureHubId || !arrivalHubId) {
            setError("Please select both departure and arrival vertiports");
            return;
        }

        if (departureHubId === arrivalHubId && hubs.length > 1) {
            setError("Departure and arrival vertiports must be different for a transit route");
            return;
        }

        const dep = hubs.find((h) => h.id === departureHubId);
        const arr = hubs.find((h) => h.id === arrivalHubId);
        const alt = Number(cruisingAltitudeM) || 120;

        let plannedRoute: any = undefined;
        if (dep?.location && arr?.location) {
            plannedRoute = {
                type: "LineString",
                coordinates: [
                    [dep.location.lng, dep.location.lat, alt],
                    [arr.location.lng, arr.location.lat, alt],
                ],
            };
        }

        const payload: Partial<Flight> = {
            flightNumber: flightNumber.trim() || undefined,
            droneId,
            departureHubId,
            arrivalHubId,
            scheduledDeparture: new Date(scheduledDeparture).toISOString(),
            scheduledArrival: new Date(scheduledArrival).toISOString(),
            cruisingAltitudeM: alt,
            notes: notes.trim() || undefined,
            plannedRoute,
            status: "planned",
        };

        setLoading(true);
        try {
            await onSubmit(payload);
            onClose();
        } catch (err: any) {
            setError(err?.message || "Failed to create flight plan");
        } finally {
            setLoading(false);
        }
    };

    const droneOptions = drones.map((d) => ({
        value: d.id,
        label: `${d.registrationNumber || d.model || "Drone"} (${d.status || "AVAILABLE"})`,
    }));

    const hubOptions = hubs.map((h) => ({
        value: h.id,
        label: `${h.code} - ${h.name}`,
    }));

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="CREATE FLIGHT OPERATION"
            maxWidth="540px"
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
            submitText="Register Flight Plan"
            loadingText="Registering..."
        >
            <div className="flex flex-col gap-4">
                <div className="form-group">
                    <label className="form-label">Flight Number / Callsign (Optional)</label>
                    <input
                        type="text"
                        value={flightNumber}
                        onChange={(e) => setFlightNumber(e.target.value)}
                        placeholder="Auto-generated (e.g. DRP-2026X)"
                        className="form-input font-mono"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Assigned Drone</label>
                    {droneOptions.length > 0 ? (
                        <CustomSelect
                            value={droneId}
                            onValueChange={setDroneId}
                            options={droneOptions}
                        />
                    ) : (
                        <div className="text-xs text-amber-600 font-medium p-2 bg-amber-50 border border-amber-200 rounded">
                            No registered drones available. Please register a drone first.
                        </div>
                    )}
                </div>

                <div className="form-row-2">
                    <div className="form-group">
                        <label className="form-label">Departure Vertiport</label>
                        <CustomSelect
                            value={departureHubId}
                            onValueChange={setDepartureHubId}
                            options={hubOptions}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Arrival Vertiport</label>
                        <CustomSelect
                            value={arrivalHubId}
                            onValueChange={setArrivalHubId}
                            options={hubOptions}
                        />
                    </div>
                </div>

                <div className="form-row-2">
                    <div className="form-group">
                        <label className="form-label">Scheduled Departure</label>
                        <input
                            type="datetime-local"
                            value={scheduledDeparture}
                            onChange={(e) => setScheduledDeparture(e.target.value)}
                            required
                            className="form-input font-mono text-xs"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Scheduled Arrival</label>
                        <input
                            type="datetime-local"
                            value={scheduledArrival}
                            onChange={(e) => setScheduledArrival(e.target.value)}
                            required
                            className="form-input font-mono text-xs"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Cruising Altitude (Meters AGL)</label>
                    <input
                        type="number"
                        min="20"
                        max="500"
                        value={cruisingAltitudeM}
                        onChange={(e) => setCruisingAltitudeM(e.target.value)}
                        required
                        className="form-input font-mono"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Notes & Remarks (Optional)</label>
                    <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Corridor routing or weather notes"
                        className="form-input"
                    />
                </div>
            </div>
        </Modal>
    );
}

export default AddFlightModal;
