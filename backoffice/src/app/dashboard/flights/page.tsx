"use client";

import { useCallback, useMemo } from "react";
import { Plus, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { ChamferButton, OutlineButton, PageHeader, AlertBanner } from "@/components/ui";
import { FlightsTable, FlightsMap, AddFlightModal } from "@/components/flights";
import { flightService } from "@/services/flightService";
import { useCrudList, useHubsAll, useDronesAll, QUERY_KEYS } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Flight } from "@/types";
import type { FlightHubCoord } from "@/components/map";

export default function FlightsPage() {
    const { data: hubs = [] } = useHubsAll();
    const { data: drones = [] } = useDronesAll();

    const fetchFlights = useCallback(() => flightService.getFlights({ limit: 0 }), []);

    const {
        items: flights,
        loading,
        error,
        setError,
        refresh: fetchData,
        isModalOpen: isAddModalOpen,
        setIsModalOpen: setIsAddModalOpen,
        highlightedId: highlightedFlightId,
        setHighlightedId: setHighlightedFlightId,
    } = useCrudList<Flight>({
        queryKey: QUERY_KEYS.flights,
        fetchFn: fetchFlights,
        entityName: "Flight",
    });

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

    const queryClient = useQueryClient();

    const invalidateFlights = () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
    };

    const createFlightMutation = useMutation({
        mutationFn: (payload: Partial<Flight>) => flightService.createFlight(payload),
        onSuccess: () => {
            toast.success("Flight operation registered successfully");
            invalidateFlights();
        },
        meta: { defaultErrorMessage: "Failed to register flight operation" },
    });

    const authorizeFlightMutation = useMutation({
        mutationFn: (flight: Flight) => flightService.authorizeFlight(flight.id),
        onSuccess: (_data, flight) => {
            toast.success(`Flight ${flight.flightNumber || flight.id} authorized by ATC`);
            invalidateFlights();
        },
        meta: { defaultErrorMessage: "Failed to authorize flight" },
    });

    const startFlightMutation = useMutation({
        mutationFn: async (flight: Flight) => {
            const status = (flight.status || "planned").toLowerCase();
            const authStatus = ((flight as any).authorizationStatus || "").toLowerCase();
            if (status !== "authorized" && authStatus !== "approved") {
                await flightService.authorizeFlight(flight.id);
            }
            return flightService.startFlight(flight.id);
        },
        onSuccess: (_data, flight) => {
            toast.success(`Flight ${flight.flightNumber || flight.id} started successfully`);
            invalidateFlights();
        },
        meta: { defaultErrorMessage: "Failed to start flight operation" },
    });

    const completeFlightMutation = useMutation({
        mutationFn: (flight: Flight) => flightService.completeFlight(flight.id),
        onSuccess: (_data, flight) => {
            toast.success(`Flight ${flight.flightNumber || flight.id} completed successfully`);
            invalidateFlights();
        },
        meta: { defaultErrorMessage: "Failed to complete flight operation" },
    });

    const abortFlightMutation = useMutation({
        mutationFn: (flight: Flight) => flightService.abortFlight(flight.id),
        onSuccess: (_data, flight) => {
            toast.success(`Flight ${flight.flightNumber || flight.id} aborted`);
            invalidateFlights();
        },
        meta: { defaultErrorMessage: "Failed to abort flight operation" },
    });

    const handleCreateFlight = async (payload: Partial<Flight>) => {
        await createFlightMutation.mutateAsync(payload);
    };

    const handleAuthorizeFlight = (flight: Flight) => {
        authorizeFlightMutation.mutate(flight);
    };

    const handleStartFlight = (flight: Flight) => {
        startFlightMutation.mutate(flight);
    };

    const handleCompleteFlight = (flight: Flight) => {
        completeFlightMutation.mutate(flight);
    };

    const handleAbortFlight = (flight: Flight) => {
        abortFlightMutation.mutate(flight);
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
