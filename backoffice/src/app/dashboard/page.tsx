"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { ChamferButton, PageHeader, StatusBadge, TacticalCallout } from "@/components/ui";
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
    const t = useTranslations("dashboard");
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

    const headerBadge = useMemo(() => {
        if (isLoadingFlights || isLoadingHubs || isLoadingDrones) {
            return { status: "syncing" as const, label: undefined };
        }
        if (isErrorFlights && isErrorHubs) {
            return { status: "offline" as const, label: undefined };
        }
        if (isErrorFlights || isErrorHubs || isErrorDrones || isErrorAlerts || isErrorZones) {
            return { status: "degraded" as const, label: undefined };
        }
        if (activeTelemetryCount > 0) {
            return {
                status: "live" as const,
                label: t("liveWsCount", { count: activeTelemetryCount }),
            };
        }
        if (isSocketConnected) {
            return { status: "online" as const, label: undefined };
        }
        return { status: "standby" as const, label: undefined };
    }, [
        isLoadingFlights,
        isLoadingHubs,
        isLoadingDrones,
        isErrorFlights,
        isErrorHubs,
        isErrorDrones,
        isErrorAlerts,
        isErrorZones,
        activeTelemetryCount,
        isSocketConnected,
        t,
    ]);

    const showAlertColumn = activeConflicts.length > 0 || actionableAlertsCount > 0;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-5 w-full shrink-0">
            <PageHeader
                title={t("title")}
                badges={<StatusBadge status={headerBadge.status} label={headerBadge.label} />}
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
                    title={
                        <span className="inline-flex flex-wrap items-center gap-2.5">
                            <StatusBadge status="critical" label={t("conflictBadge")} />
                            <span>
                                {activeConflicts.length === 1
                                    ? t("conflictCalloutSingle")
                                    : t("conflictCalloutPlural", {
                                          count: activeConflicts.length,
                                      })}
                            </span>
                        </span>
                    }
                    rightSlot={
                        <ChamferButton
                            variant="outline"
                            size="xs"
                            clip="xs"
                            href="/dashboard/conflicts"
                            innerClassName="font-mono uppercase tracking-wider text-[11px]"
                        >
                            <span>{t("resolveAction")}</span>
                            <ArrowRight className="w-3 h-3" aria-hidden="true" />
                        </ChamferButton>
                    }
                />
            )}

            <DashboardTacticalMap
                activeFlights={activeFlights}
                hubs={hubs}
                airspaceZones={zones}
                telemetryMap={telemetryMap}
            />

            <div
                className={
                    showAlertColumn
                        ? "grid grid-cols-1 lg:grid-cols-2 gap-5 w-full items-start"
                        : "w-full"
                }
            >
                <DashboardFlightLog flights={allFlights} hubs={hubs} isLoading={isLoadingFlights} />
                {showAlertColumn && <ActiveAlerts fixedHeight={false} />}
            </div>
        </div>
    );
}
