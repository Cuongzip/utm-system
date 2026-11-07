"use client";

import { useMemo, useState, useEffect } from "react";
import { PageHeader } from "@/components/ui";
import {
    DashboardKpiStrip,
    DashboardTacticalMap,
    DashboardFlightLog,
    DashboardDiagnostics,
    API_HEALTH_STATUSES,
    type ApiHealthStatus,
} from "@/components/dashboard";
import {
    useFlightsAll,
    useHubsAll,
    useDronesAll,
    useActiveAlerts,
    useAirspaceAll,
    useLiveTelemetry,
    useConnectivityDevices,
} from "@/hooks";
import { ACTIVE_FLIGHT_STATUSES, ACTIVE_HUB_STATUS } from "@/types";
import { formatDateTime } from "@/utils/format";

export default function DashboardPage() {
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
    const { data: devices = [] } = useConnectivityDevices();

    const [lastSyncedTime, setLastSyncedTime] = useState("");

    useEffect(() => {
        setLastSyncedTime(formatDateTime(new Date(), "HH:mm:ss"));
    }, [allFlights, hubs, drones, alerts, zones, devices]);

    const activeFlights = useMemo(() => {
        return allFlights.filter((f) => f.status && ACTIVE_FLIGHT_STATUSES.includes(f.status));
    }, [allFlights]);

    const { telemetryMap, telemetryHistoryMap, isSocketConnected, activeTelemetryCount } =
        useLiveTelemetry(activeFlights);

    const onlineHubsCount = useMemo(() => {
        return hubs.filter((h) => (h.status ?? ACTIVE_HUB_STATUS) === ACTIVE_HUB_STATUS).length;
    }, [hubs]);

    const apiStatus: ApiHealthStatus = useMemo(() => {
        if (isLoadingFlights || isLoadingHubs || isLoadingDrones)
            return API_HEALTH_STATUSES.LOADING;
        if (isErrorFlights && isErrorHubs) return API_HEALTH_STATUSES.ERROR;
        if (isErrorFlights || isErrorHubs || isErrorDrones || isErrorAlerts || isErrorZones) {
            return API_HEALTH_STATUSES.DEGRADED;
        }
        return API_HEALTH_STATUSES.CONNECTED;
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

    return (
        <div className="p-8 space-y-6 flex flex-col w-full min-h-[calc(100vh-80px)]">
            <PageHeader title="OPERATIONS CENTER" />

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
