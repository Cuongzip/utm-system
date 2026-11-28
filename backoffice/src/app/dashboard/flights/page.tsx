"use client";

import { useState, useCallback, useMemo, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, RotateCw } from "lucide-react";
import {
    ChamferButton,
    PageHeader,
    TableFilterBar,
    ErrorState,
    type SelectOption,
} from "@/components/ui";
import { FlightsTable, PreFlightBriefingModal } from "@/components/flights";
import { useFlightLifecycleActions } from "@/components/flights/useFlightLifecycleActions";
import { flightService } from "@/services/flightService";
import { useCrudList, useHubsAll, useDronesAll, usePermissions, QUERY_KEYS } from "@/hooks";
import { useAppLocale } from "@/i18n";
import { createStatusOptions, compareCreatedDesc } from "@/utils";
import { ACTIVE_FLIGHT_STATUSES, FLIGHT_STATUSES, type Flight } from "@/types";

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

    const { authorizeByFlight, startByFlight, completeByFlight, abortByFlight } =
        useFlightLifecycleActions();

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
        if (!flight?.id) return;
        if (flight.status && ACTIVE_FLIGHT_STATUSES.includes(flight.status)) {
            router.push(`/dashboard/flights/${flight.id}/cockpit`);
        } else {
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
                    onOpenDeck={(flight) => router.push(`/dashboard/flights/${flight.id}/cockpit`)}
                    onViewDossier={(flight) => router.push(`/dashboard/flights/${flight.id}`)}
                    onOpenBriefing={setBriefingFlight}
                    onAuthorizeFlight={authorizeByFlight}
                    onStartFlight={startByFlight}
                    onCompleteFlight={completeByFlight}
                    onAbortFlight={abortByFlight}
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
