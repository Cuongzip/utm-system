"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertOctagon } from "lucide-react";
import { PageHeader, StatusBadge, TacticalCallout } from "@/components/ui";
import {
    DashboardKpiStrip,
    DashboardTacticalMap,
    DashboardFlightLog,
} from "@/components/dashboard";
import { ActiveAlerts } from "@/components/control-center";
import {
    useFlightsAll,
    useHubsAll,
    useDronesAll,
    useActiveAlerts,
    useConflictsActive,
    useAirspaceAll,
    useLiveTelemetry,
} from "@/hooks";
import { ACTIVE_FLIGHT_STATUSES, ACTIVE_HUB_STATUS, ALERT_STATUS } from "@/types";

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
    const { data: activeAlerts = [], isError: isErrorAlerts } = useActiveAlerts();
    const { data: activeConflicts = [] } = useConflictsActive();
    const { data: zones = [], isError: isErrorZones } = useAirspaceAll();

    const activeFlights = useMemo(() => {
        return allFlights.filter((f) => f.status && ACTIVE_FLIGHT_STATUSES.includes(f.status));
    }, [allFlights]);

    const { telemetryMap, isSocketConnected, activeTelemetryCount } =
        useLiveTelemetry(activeFlights);

    const onlineHubsCount = useMemo(() => {
        return hubs.filter((h) => (h.status ?? ACTIVE_HUB_STATUS) === ACTIVE_HUB_STATUS).length;
    }, [hubs]);

    const actionableAlertsCount = useMemo(() => {
        return activeAlerts.filter(
            (a) =>
                a.status !== ALERT_STATUS.RESOLVED &&
                a.status !== ALERT_STATUS.DISMISSED &&
                a.status !== ALERT_STATUS.ACKNOWLEDGED
        ).length;
    }, [activeAlerts]);

    const apiBadge = useMemo(() => {
        if (isLoadingFlights || isLoadingHubs || isLoadingDrones) {
            return { status: "pending" as const, label: "SYNCING" };
        }
        if (isErrorFlights && isErrorHubs) {
            return { status: "offline" as const, label: "API OFFLINE" };
        }
        if (isErrorFlights || isErrorHubs || isErrorDrones || isErrorAlerts || isErrorZones) {
            return { status: "warning" as const, label: "DEGRADED" };
        }
        return { status: "online" as const, label: "API ONLINE" };
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

    const showAlertColumn = activeConflicts.length > 0 || actionableAlertsCount > 0;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-5 flex flex-col w-full min-h-[calc(100vh-80px)]">
            <PageHeader
                title="OPERATIONS CENTER"
                badges={
                    <>
                        <StatusBadge status={apiBadge.status} label={apiBadge.label} />
                        <StatusBadge
                            status={
                                activeTelemetryCount > 0 || isSocketConnected ? "live" : "standby"
                            }
                            label={
                                activeTelemetryCount > 0
                                    ? `${activeTelemetryCount} LIVE WS`
                                    : isSocketConnected
                                      ? "WS READY"
                                      : "STANDBY"
                            }
                        />
                    </>
                }
            />

            <DashboardKpiStrip
                activeFlightsCount={activeFlights.length}
                hubsCount={onlineHubsCount}
                totalHubsCount={hubs.length}
                fleetCount={drones.length}
                conflictsCount={activeConflicts.length}
                activeTelemetryCount={activeTelemetryCount}
                isLoading={isLoadingFlights || isLoadingHubs}
            />

            {activeConflicts.length > 0 && (
                <TacticalCallout
                    tone="critical"
                    icon={AlertOctagon}
                    title={`${activeConflicts.length} active separation conflict${
                        activeConflicts.length > 1 ? "s" : ""
                    } detected in monitored airspace`}
                    rightSlot={
                        <Link
                            href="/dashboard/conflicts"
                            className="text-xs font-mono font-bold uppercase tracking-wider text-red-700 hover:text-red-900 underline underline-offset-2"
                        >
                            Resolve Conflicts →
                        </Link>
                    }
                />
            )}

            <DashboardTacticalMap
                activeFlights={activeFlights}
                hubs={hubs}
                airspaceZones={zones}
                telemetryMap={telemetryMap}
                activeTelemetryCount={activeTelemetryCount}
                isSocketConnected={isSocketConnected}
            />

            <div
                className={
                    showAlertColumn ? "grid grid-cols-1 lg:grid-cols-2 gap-5 w-full" : "w-full"
                }
            >
                <DashboardFlightLog flights={allFlights} hubs={hubs} isLoading={isLoadingFlights} />
                {showAlertColumn && <ActiveAlerts fixedHeight={false} />}
            </div>
        </div>
    );
}
