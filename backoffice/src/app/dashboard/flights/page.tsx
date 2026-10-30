"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { ChamferButton, OutlineButton, PageHeader, AlertBanner } from "@/components/ui";
import { FlightsTable } from "@/components/flights";
import { flightService } from "@/services/flightService";
import { useCrudList, useHubsAll, useDronesAll, QUERY_KEYS } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Flight } from "@/types";

export default function FlightsPage() {
    const router = useRouter();
    const { data: hubs = [] } = useHubsAll();
    const { data: drones = [] } = useDronesAll();

    const fetchFlights = useCallback(() => flightService.getFlights({ limit: 0 }), []);

    const {
        items: flights,
        loading,
        error,
        setError,
        refresh: fetchData,
        highlightedId: highlightedFlightId,
    } = useCrudList<Flight>({
        queryKey: QUERY_KEYS.flights,
        fetchFn: fetchFlights,
        entityName: "Flight",
    });

    const hubMap = useMemo(
        () => new Map(hubs.filter((h) => h.id).map((h) => [h.id, h.name || h.code || h.id])),
        [hubs]
    );

    const droneMap = useMemo(
        () =>
            new Map(
                drones
                    .filter((d) => d.id)
                    .map((d) => [d.id, d.registrationNumber || d.model || d.id])
            ),
        [drones]
    );

    const queryClient = useQueryClient();

    const authorizeFlightMutation = useMutation({
        mutationFn: (flight: Flight) => flightService.authorizeFlight(flight.id),
        onSuccess: (_data, flight) => {
            toast.success(`Flight ${flight.flightNumber || flight.id} authorized by ATC`);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
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
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
        },
        meta: { defaultErrorMessage: "Failed to start flight operation" },
    });

    const completeFlightMutation = useMutation({
        mutationFn: (flight: Flight) => flightService.completeFlight(flight.id),
        onSuccess: (_data, flight) => {
            toast.success(`Flight ${flight.flightNumber || flight.id} completed successfully`);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
        },
        meta: { defaultErrorMessage: "Failed to complete flight operation" },
    });

    const abortFlightMutation = useMutation({
        mutationFn: (flight: Flight) => flightService.abortFlight(flight.id),
        onSuccess: (_data, flight) => {
            toast.success(`Flight ${flight.flightNumber || flight.id} aborted`);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
        },
        meta: { defaultErrorMessage: "Failed to abort flight operation" },
    });

    const handleSelectFlight = (flight: Flight | null) => {
        if (flight?.id) {
            router.push(`/dashboard/flights/${flight.id}`);
        }
    };

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader title="FLIGHTS">
                <OutlineButton size="sm" onClick={fetchData}>
                    <RotateCw className="w-3.5 h-3.5 text-[#334155]" />
                    <span>Refresh</span>
                </OutlineButton>

                <ChamferButton
                    variant="dark"
                    size="sm"
                    onClick={() => router.push("/dashboard/flights/new")}
                >
                    <Plus className="w-4 h-4 text-white" />
                    <span>New Flight</span>
                </ChamferButton>
            </PageHeader>

            {error && <AlertBanner message={error} onDismiss={() => setError(null)} />}

            <FlightsTable
                flights={flights}
                loading={loading}
                selectedFlightId={highlightedFlightId}
                onSelectFlight={handleSelectFlight}
                onAuthorizeFlight={authorizeFlightMutation.mutate}
                onStartFlight={startFlightMutation.mutate}
                onCompleteFlight={completeFlightMutation.mutate}
                onAbortFlight={abortFlightMutation.mutate}
                onNewFlight={() => router.push("/dashboard/flights/new")}
                hubMap={hubMap}
                droneMap={droneMap}
            />
        </div>
    );
}
