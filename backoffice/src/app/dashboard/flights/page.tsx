"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { ChamferButton, OutlineButton, PageHeader, AlertBanner } from "@/components/ui";
import { FlightsTable, FlightsMap, AddFlightModal } from "@/components/flights";
import { flightService } from "@/services/flightService";
import { droneService } from "@/services/droneService";
import { hubService } from "@/services/hubService";
import { ApiError } from "@/services/apiClient";
import type { Flight, Drone, Hub } from "@/types";
import type { FlightHubCoord } from "@/components/map";

export default function FlightsPage() {
    const [flights, setFlights] = useState<Flight[]>([]);
    const [drones, setDrones] = useState<Drone[]>([]);
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [highlightedFlightId, setHighlightedFlightId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [flightsRes, dronesRes, hubsRes] = await Promise.all([
                flightService.getFlights({ limit: 0 }),
                droneService.getDrones({ limit: 0 }),
                hubService.getHubs({ limit: 0 }),
            ]);

            setFlights(flightsRes.items || []);
            setDrones(dronesRes.items || []);
            setHubs(hubsRes.items || []);
            setError(null);
        } catch {
            setError("Failed to fetch flight operations and route data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const hubMap = useMemo(() => {
        const map = new Map<string, string>();
        hubs.forEach((h) => {
            if (h.id) map.set(h.id, h.name || h.code || h.id);
        });
        return map;
    }, [hubs]);

    const hubCoordsMap = useMemo(() => {
        const map = new Map<string, FlightHubCoord>();
        hubs.forEach((h) => {
            if (h.id && h.location?.lat !== undefined && h.location?.lng !== undefined) {
                map.set(h.id, {
                    lat: h.location.lat,
                    lng: h.location.lng,
                    name: h.name,
                    code: h.code,
                });
            }
        });
        return map;
    }, [hubs]);

    const droneMap = useMemo(() => {
        const map = new Map<string, string>();
        drones.forEach((d) => {
            if (d.id) map.set(d.id, d.registrationNumber || d.model || d.id);
        });
        return map;
    }, [drones]);

    const handleCreateFlight = async (payload: Partial<Flight>) => {
        try {
            await flightService.createFlight(payload);
            toast.success("Flight operation registered successfully");
            await fetchData();
        } catch (err: unknown) {
            const msg =
                err instanceof ApiError &&
                typeof err.data === "object" &&
                err.data &&
                "message" in err.data
                    ? String((err.data as any).message)
                    : "Failed to register flight operation";
            toast.error(msg);
            throw err;
        }
    };

    const handleAuthorizeFlight = async (flight: Flight) => {
        try {
            await flightService.authorizeFlight(flight.id);
            toast.success(`Flight ${flight.flightNumber || flight.id} authorized by ATC`);
            await fetchData();
        } catch (err: unknown) {
            const msg =
                err instanceof ApiError &&
                typeof err.data === "object" &&
                err.data &&
                "message" in err.data
                    ? String((err.data as any).message)
                    : "Failed to authorize flight";
            toast.error(msg);
        }
    };

    const handleStartFlight = async (flight: Flight) => {
        try {
            const status = (flight.status || "planned").toLowerCase();
            const authStatus = ((flight as any).authorizationStatus || "").toLowerCase();
            if (status !== "authorized" && authStatus !== "approved") {
                await flightService.authorizeFlight(flight.id);
            }
            await flightService.startFlight(flight.id);
            toast.success(`Flight ${flight.flightNumber || flight.id} started successfully`);
            await fetchData();
        } catch (err: unknown) {
            const msg =
                err instanceof ApiError &&
                typeof err.data === "object" &&
                err.data &&
                "message" in err.data
                    ? String((err.data as any).message)
                    : "Failed to start flight operation";
            toast.error(msg);
        }
    };

    const handleCompleteFlight = async (flight: Flight) => {
        try {
            await flightService.completeFlight(flight.id);
            toast.success(`Flight ${flight.flightNumber || flight.id} completed successfully`);
            await fetchData();
        } catch (err: unknown) {
            const msg =
                err instanceof ApiError &&
                typeof err.data === "object" &&
                err.data &&
                "message" in err.data
                    ? String((err.data as any).message)
                    : "Failed to complete flight operation";
            toast.error(msg);
        }
    };

    const handleAbortFlight = async (flight: Flight) => {
        try {
            await flightService.abortFlight(flight.id);
            toast.success(`Flight ${flight.flightNumber || flight.id} aborted`);
            await fetchData();
        } catch (err: unknown) {
            const msg =
                err instanceof ApiError &&
                typeof err.data === "object" &&
                err.data &&
                "message" in err.data
                    ? String((err.data as any).message)
                    : "Failed to abort flight operation";
            toast.error(msg);
        }
    };

    const handleSelectFlight = (flight: Flight | null) => {
        setHighlightedFlightId(flight ? flight.id : null);
    };

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader title="FLIGHTS">
                <OutlineButton size="sm" onClick={fetchData}>
                    <RotateCw className="w-3.5 h-3.5 text-[#334155]" />
                    <span>Refresh</span>
                </OutlineButton>

                <ChamferButton variant="dark" size="sm" onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="w-4 h-4 text-white" />
                    <span>New Flight</span>
                </ChamferButton>
            </PageHeader>

            {error && <AlertBanner message={error} onDismiss={() => setError(null)} />}

            <div className="flex flex-col gap-6 w-full">
                <FlightsTable
                    flights={flights}
                    loading={loading}
                    selectedFlightId={highlightedFlightId}
                    onSelectFlight={handleSelectFlight}
                    onAuthorizeFlight={handleAuthorizeFlight}
                    onStartFlight={handleStartFlight}
                    onCompleteFlight={handleCompleteFlight}
                    onAbortFlight={handleAbortFlight}
                    onNewFlight={() => setIsAddModalOpen(true)}
                    hubMap={hubMap}
                    droneMap={droneMap}
                />

                <div className="w-full h-[560px]">
                    <FlightsMap
                        flights={flights}
                        selectedFlightId={highlightedFlightId}
                        onSelectFlight={handleSelectFlight}
                        hubMap={hubMap}
                        hubCoordsMap={hubCoordsMap}
                        droneMap={droneMap}
                    />
                </div>
            </div>

            <AddFlightModal
                isOpen={isAddModalOpen}
                drones={drones}
                hubs={hubs}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleCreateFlight}
            />
        </div>
    );
}
