"use client";

import { useState, useCallback, useMemo, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { useAppLocale } from "@/i18n";
import { createStatusOptions, compareCreatedDesc } from "@/utils";
import { FLIGHT_STATUSES, type Flight } from "@/types";

export default function FlightsPage() {
    const router = useRouter();
    const t = useTranslations("flights");
    const tCommon = useTranslations("common");
    const locale = useAppLocale();
    const statusOptions: SelectOption[] = useMemo(() => {
        void locale;
        return createStatusOptions(FLIGHT_STATUSES);
    }, [locale]);
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
            handleMutationSuccess(
                t("toasts.authorized", { flight: flight.flightNumber || flight.id })
            ),
        meta: { defaultErrorMessage: t("toasts.authorizeFailed") },
    });

    const startFlightMutation = useMutation({
        mutationFn: (flight: Flight) => flightService.startFlight(flight.id),
        onSuccess: (_data, flight) =>
            handleMutationSuccess(
                t("toasts.started", { flight: flight.flightNumber || flight.id })
            ),
        meta: { defaultErrorMessage: t("toasts.startFailed") },
    });

    const completeFlightMutation = useMutation({
        mutationFn: (flight: Flight) => flightService.completeFlight(flight.id),
        onSuccess: (_data, flight) =>
            handleMutationSuccess(
                t("toasts.completed", { flight: flight.flightNumber || flight.id })
            ),
        meta: { defaultErrorMessage: t("toasts.completeFailed") },
    });

    const abortFlightMutation = useMutation({
        mutationFn: (flight: Flight) => flightService.abortFlight(flight.id),
        onSuccess: (_data, flight) =>
            handleMutationSuccess(
                t("toasts.aborted", { flight: flight.flightNumber || flight.id })
            ),
        meta: { defaultErrorMessage: t("toasts.abortFailed") },
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
            .sort(compareCreatedDesc);
    }, [flights, deferredSearch, statusFilter, hubMap, droneMap]);

    const handleSelectFlight = (flight: Flight | null) => {
        if (flight?.id) {
            router.push(`/dashboard/flights/${flight.id}`);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-5 w-full">
            <PageHeader title={t("title")}>
                <ChamferButton variant="outline" size="sm" clip="xs" onClick={fetchData}>
                    <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>{tCommon("refresh")}</span>
                </ChamferButton>

                <ChamferButton
                    variant="dark"
                    size="sm"
                    onClick={() => router.push("/dashboard/flights/new")}
                >
                    <Plus className="w-4 h-4 text-white" />
                    <span>{t("newFlight")}</span>
                </ChamferButton>
            </PageHeader>

            <TableFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={t("searchPlaceholder")}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                statusOptions={statusOptions}
                onClearFilters={clearFilters}
                totalCount={flights.length}
                filteredCount={filteredFlights.length}
            />

            {isError && flights.length === 0 ? (
                <ErrorState
                    title={t("loadErrorTitle")}
                    description={t("loadErrorDesc")}
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
