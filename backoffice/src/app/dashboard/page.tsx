"use client";

import { useMemo, useState, useEffect } from "react";
import { PageHeader } from "@/components/ui";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    DashboardKpiStrip,
    DashboardTacticalMap,
    DashboardFlightLog,
    DashboardDiagnostics,
} from "@/components/dashboard";
import {
    useFlightsAll,
    useHubsAll,
    useDronesAll,
    useActiveAlerts,
    useAirspaceAll,
    useLiveTelemetry,
    QUERY_KEYS,
} from "@/hooks";
import { connectivityService } from "@/services/connectivityService";
import { formatDate, formatDateTime } from "@/utils/format";

export default function DashboardPage() {
    const queryClient = useQueryClient();
    const {
        data: allFlights = [],
        isLoading: isLoadingFlights,
        isError: isErrorFlights,
    } = useFlightsAll();
    const { data: hubs = [], isLoading: isLoadingHubs, isError: isErrorHubs } = useHubsAll();
    const {
        data: drones = [],
        isLoading: isLoadingDrones,
        isError: isErrorDrones,
    } = useDronesAll();
    const { data: alerts = [], isError: isErrorAlerts } = useActiveAlerts();
    const { data: zones = [], isError: isErrorZones } = useAirspaceAll();

    const { data: devices = [] } = useQuery({
        queryKey: QUERY_KEYS.connectivityDevices,
        queryFn: async () => {
            const res = await connectivityService.getDevices();
            return res?.items || [];
        },
    });

    const [currentDateStr, setCurrentDateStr] = useState("2026-10-30");
    const [lastSyncedTime, setLastSyncedTime] = useState("");
    const [isManualSyncing, setIsManualSyncing] = useState(false);

    useEffect(() => {
        setCurrentDateStr(formatDate(new Date(), "yyyy-MM-dd"));
        setLastSyncedTime(formatDateTime(new Date(), "HH:mm:ss"));
    }, [allFlights, hubs, drones, alerts, zones, devices]);

    const activeFlights = useMemo(() => {
        return (allFlights || []).filter((f) => {
            const s = (f.status || "").toLowerCase().replace(/[\s-]+/g, "_");
            return (
                s === "active" || s === "in_flight" || s === "diverted" || s === "emergency_landing"
            );
        });
    }, [allFlights]);

    const { telemetryMap, telemetryHistoryMap, isSocketConnected, activeTelemetryCount } =
        useLiveTelemetry(activeFlights);

    const onlineHubsCount = useMemo(() => {
        return (hubs || []).filter((h) => {
            const s = (h.status || "active").toLowerCase();
            return s === "active" || s === "online";
        }).length;
    }, [hubs]);

    const apiStatus = useMemo(() => {
        if (isLoadingFlights || isLoadingHubs || isLoadingDrones) return "loading";
        if (isErrorFlights && isErrorHubs) return "error";
        if (isErrorFlights || isErrorHubs || isErrorDrones || isErrorAlerts || isErrorZones) {
            return "degraded";
        }
        return "connected";
    }, [
        isLoadingFlights,
        isLoadingHubs,
        isLoadingDrones,
        isErrorFlights,
        isErrorHubs,
        isErrorDrones,
        isErrorAlerts,
        isErrorZones,
    ]);

    const handleManualRefresh = async () => {
        setIsManualSyncing(true);
        try {
            await queryClient.invalidateQueries();
            setLastSyncedTime(formatDateTime(new Date(), "HH:mm:ss"));
            toast.success("Operations Center synchronized with backend");
        } catch {
            toast.error("Failed to synchronize with backend");
        } finally {
            setIsManualSyncing(false);
        }
    };

    return (
        <div className="p-8 space-y-6 flex flex-col w-full min-h-[calc(100vh-80px)]">
            <PageHeader title="OPERATIONS CENTER">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-slate-200 bg-white text-xs font-mono font-medium text-slate-700 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>LIVE</span>
                        <span className="text-slate-300">|</span>
                        <span>{currentDateStr}</span>
                    </span>

                    <button
                        type="button"
                        onClick={handleManualRefresh}
                        disabled={isManualSyncing}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-slate-200 bg-white text-xs font-mono font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                        title="Force refresh backend data"
                    >
                        <RotateCw
                            className={`w-3.5 h-3.5 ${
                                isManualSyncing ? "animate-spin text-cyan-600" : "text-slate-500"
                            }`}
                        />
                        <span>SYNC</span>
                    </button>
                </div>
            </PageHeader>

            <DashboardKpiStrip
                activeFlightsCount={activeFlights.length}
                hubsCount={onlineHubsCount}
                totalHubsCount={hubs.length}
                fleetCount={drones.length}
                conflictsCount={alerts.length}
                activeTelemetryCount={activeTelemetryCount}
                isLoading={isLoadingFlights || isLoadingHubs}
            />

            <DashboardTacticalMap
                flights={allFlights}
                activeFlights={activeFlights}
                hubs={hubs}
                dronesCount={drones.length}
                airspaceZones={zones}
                telemetryMap={telemetryMap}
                telemetryHistoryMap={telemetryHistoryMap}
                activeTelemetryCount={activeTelemetryCount}
                isSocketConnected={isSocketConnected}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                <DashboardFlightLog flights={allFlights} isLoading={isLoadingFlights} />
                <DashboardDiagnostics
                    hubsOnline={onlineHubsCount}
                    totalHubs={hubs.length}
                    fleetSize={drones.length}
                    conflictsCount={alerts.length}
                    connectedDevicesCount={devices.length}
                    apiStatus={apiStatus}
                    isSocketConnected={isSocketConnected}
                    activeTelemetryCount={activeTelemetryCount}
                    lastSyncedTime={lastSyncedTime}
                />
            </div>
        </div>
    );
}
