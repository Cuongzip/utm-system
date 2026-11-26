"use client";

import { useState, useCallback, useMemo, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCw } from "lucide-react";
import { toast } from "sonner";
import {
    ChamferButton,
    PageHeader,
    TableFilterBar,
    ErrorState,
    type SelectOption,
} from "@/components/ui";
import { FlightsTable, PreFlightBriefingModal } from "@/components/flights";
import { flightService } from "@/services/flightService";
import { useCrudList, useHubsAll, useDronesAll, usePermissions, QUERY_KEYS } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStatusOptions } from "@/utils";
import { ACTIVE_FLIGHT_STATUSES, FLIGHT_STATUS, FLIGHT_STATUSES, type Flight } from "@/types";

const STATUS_OPTIONS: SelectOption[] = createStatusOptions(FLIGHT_STATUSES);

function flightStatusPriority(status?: string): number {
    const s = (status || "").toLowerCase();
    if (s === FLIGHT_STATUS.ACTIVE) return 0;
    if (ACTIVE_FLIGHT_STATUSES.includes(s as (typeof ACTIVE_FLIGHT_STATUSES)[number])) return 1;
    if (
        s === FLIGHT_STATUS.PLANNED ||
        s === FLIGHT_STATUS.SCHEDULED ||
        s === FLIGHT_STATUS.AUTHORIZED
    ) {
        return 2;
    }
    return 3;
}

export default function FlightsPage() {
    const router = useRouter();
    const { canAuthorizeFlight } = usePermissions();
    const { data: hubs = [] } = useHubsAll();
    const { data: drones = [] } = useDronesAll();
    const [briefingFlight, setBriefingFlight] = useState<Flight | null>(null);

    const fetchFlights = useCallback(() => flightService.getFlights({ limit: 0 }), []);

    const {
        items: flights,
        loading,
        isError,
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

    const handleMutationSuccess = (message: string) => {
        toast.success(message);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
    };

    const authorizeFlightMutation = useMutation({
        mutationFn: (flight: Flight) => flightService.authorizeFlight(flight.id),
        onSuccess: (_data, flight) =>
            handleMutationSuccess(`Flight ${flight.flightNumber || flight.id} authorized by ATC`),
        meta: { defaultErrorMessage: "Failed to authorize flight" },
    });

    const startFlightMutation = useMutation({
        mutationFn: (flight: Flight) => flightService.startFlight(flight.id),
        onSuccess: (_data, flight) =>
            handleMutationSuccess(
                `Flight ${flight.flightNumber || flight.id} started successfully`
            ),
        meta: { defaultErrorMessage: "Failed to start flight operation" },
    });

    const completeFlightMutation = useMutation({
        mutationFn: (flight: Flight) => flightService.completeFlight(flight.id),
        onSuccess: (_data, flight) =>
            handleMutationSuccess(
                `Flight ${flight.flightNumber || flight.id} completed successfully`
            ),
        meta: { defaultErrorMessage: "Failed to complete flight operation" },
    });

    const abortFlightMutation = useMutation({
        mutationFn: (flight: Flight) => flightService.abortFlight(flight.id),
        onSuccess: (_data, flight) =>
            handleMutationSuccess(`Flight ${flight.flightNumber || flight.id} aborted`),
        meta: { defaultErrorMessage: "Failed to abort flight operation" },
    });

    const [searchQuery, setSearchQuery] = useState("");
    const deferredSearch = useDeferredValue(searchQuery);
    const [statusFilter, setStatusFilter] = useState("all");

    const hasFilters = Boolean(searchQuery.trim()) || statusFilter !== "all";

    const clearFilters = useCallback(() => {
        setSearchQuery("");
        setStatusFilter("all");
    }, []);

    const filteredFlights = useMemo(() => {
        const query = deferredSearch.toLowerCase().trim();
        const status = statusFilter.toLowerCase();
        return [...flights]
            .filter((f) => {
                const depHubName = (f.departureHubId ? hubMap.get(f.departureHubId) : "") || "";
                const arrHubName = (f.arrivalHubId ? hubMap.get(f.arrivalHubId) : "") || "";
                const droneName = (f.droneId ? droneMap.get(f.droneId) : "") || "";

                const matchesSearch =
                    !query ||
                    (f.flightNumber || "").toLowerCase().includes(query) ||
                    (f.pilotId || "").toLowerCase().includes(query) ||
                    depHubName.toLowerCase().includes(query) ||
                    arrHubName.toLowerCase().includes(query) ||
                    droneName.toLowerCase().includes(query);

                const fStatus = (f.status || "").toLowerCase();
                const matchesStatus = status === "all" || fStatus === status;

                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                const prio = flightStatusPriority(a.status) - flightStatusPriority(b.status);
                if (prio !== 0) return prio;
                const tA = new Date(a.scheduledDeparture || a.actualDeparture || 0).getTime();
                const tB = new Date(b.scheduledDeparture || b.actualDeparture || 0).getTime();
                return tB - tA;
            });
    }, [flights, deferredSearch, statusFilter, hubMap, droneMap]);

    const handleSelectFlight = (flight: Flight | null) => {
        if (flight?.id) {
            router.push(`/dashboard/flights/${flight.id}`);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-5 w-full">
            <PageHeader title="FLIGHTS">
                <ChamferButton variant="outline" size="sm" clip="xs" onClick={fetchData}>
                    <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Refresh</span>
                </ChamferButton>

                <ChamferButton
                    variant="dark"
                    size="sm"
                    onClick={() => router.push("/dashboard/flights/new")}
                >
                    <Plus className="w-4 h-4 text-white" />
                    <span>New Flight</span>
                </ChamferButton>
            </PageHeader>

            <TableFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search flight number, drone, or hub..."
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                statusOptions={STATUS_OPTIONS}
                onClearFilters={clearFilters}
                totalCount={flights.length}
                filteredCount={filteredFlights.length}
            />

            {isError && flights.length === 0 ? (
                <ErrorState
                    title="Unable to load flights"
                    description="The Flight Service could not be reached. Please try again."
                    onRetry={fetchData}
                />
            ) : (
                <FlightsTable
                    flights={filteredFlights}
                    loading={loading}
                    canAuthorize={canAuthorizeFlight}
                    selectedFlightId={highlightedFlightId}
                    hasFilters={hasFilters}
                    onClearFilters={clearFilters}
                    onSelectFlight={handleSelectFlight}
                    onOpenBriefing={setBriefingFlight}
                    onAuthorizeFlight={authorizeFlightMutation.mutate}
                    onStartFlight={startFlightMutation.mutate}
                    onCompleteFlight={completeFlightMutation.mutate}
                    onAbortFlight={abortFlightMutation.mutate}
                    onNewFlight={() => router.push("/dashboard/flights/new")}
                    hubMap={hubMap}
                    droneMap={droneMap}
                />
            )}

            <PreFlightBriefingModal
                isOpen={Boolean(briefingFlight)}
                flightId={briefingFlight?.id}
                flightNumber={briefingFlight?.flightNumber}
                onClose={() => setBriefingFlight(null)}
            />
        </div>
    );
}
