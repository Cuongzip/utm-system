"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Copy, Check, ExternalLink, ScrollText, Satellite } from "lucide-react";
import {
    ChamferCard,
    StatusBadge,
    EmptyState,
    UnderlineTabs,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    type UnderlineTabItem,
} from "@/components/ui";
import { useTelemetryStream } from "@/hooks/useStomp";
import { useSimulationEvents, useFlightsAll, useDronesAll } from "@/hooks";
import { toast } from "sonner";
import { formatTime, formatCoordinates, formatAltitude } from "@/utils";
import {
    SIMULATION_STATUS,
    SIMULATION_SCENARIO,
    type SimulationSession,
    type TelemetryRecord,
} from "@/types";

export interface SessionLiveFeedProps {
    session: SimulationSession;
}

type TabType = "telemetry" | "events" | "specs";

export function SessionLiveFeed({ session }: SessionLiveFeedProps) {
    const t = useTranslations("simulation.liveFeed");
    const [activeTab, setActiveTab] = useState<TabType>("telemetry");
    const [wsRecords, setWsRecords] = useState<TelemetryRecord[]>([]);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const { data: flights = [] } = useFlightsAll();
    const { data: drones = [] } = useDronesAll();

    const normStatus = String(session.status || "").toLowerCase();
    const isRunning = normStatus === SIMULATION_STATUS.RUNNING;
    const isC2Lost =
        String(session.activeScenario || "").toLowerCase() === SIMULATION_SCENARIO.C2_LOST;

    const handleIncomingRecord = useCallback(
        (rec: TelemetryRecord) => {
            if (!rec || isC2Lost) return;
            setWsRecords((prev) => [rec, ...prev.slice(0, 49)]);
        },
        [isC2Lost]
    );

    useTelemetryStream(handleIncomingRecord, session.flightId, isRunning && !isC2Lost);

    const records = useMemo<TelemetryRecord[]>(() => {
        if (isC2Lost || session.currentLat == null || session.currentLon == null) {
            return wsRecords;
        }
        const latest = wsRecords[0];
        if (
            latest &&
            Math.abs((latest.latitude ?? 0) - session.currentLat) < 1e-6 &&
            Math.abs((latest.longitude ?? 0) - session.currentLon) < 1e-6 &&
            Math.abs((latest.batteryPercentage ?? 0) - (session.currentBattery ?? 100)) < 1e-2
        ) {
            return wsRecords;
        }
        const snap: TelemetryRecord = {
            id: `snap-${session.lastModifiedOn || session.id}`,
            flightId: session.flightId,
            droneId: session.droneId,
            latitude: session.currentLat,
            longitude: session.currentLon,
            altitude: session.currentAlt ?? 0,
            speed: session.speed ?? 0,
            heading: session.currentHeading ?? 0,
            batteryPercentage: session.currentBattery ?? 100,
            timestamp: session.lastModifiedOn || session.createdOn,
        };
        return [snap, ...wsRecords.slice(0, 49)];
    }, [
        wsRecords,
        isC2Lost,
        session.id,
        session.currentLat,
        session.currentLon,
        session.currentAlt,
        session.speed,
        session.currentHeading,
        session.currentBattery,
        session.flightId,
        session.droneId,
        session.lastModifiedOn,
        session.createdOn,
    ]);

    const { data: events = [] } = useSimulationEvents(session.id, isRunning);

    const handleCopy = (text: string, fieldKey: string, fieldLabel: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldKey);
        toast.success(t("copiedToast", { field: fieldLabel }));
        setTimeout(() => setCopiedField(null), 1800);
    };

    const isCompleted =
        normStatus === SIMULATION_STATUS.COMPLETED ||
        (session.progress != null && session.progress >= 100);

    const latLonText = formatCoordinates(
        { latitude: session.currentLat, longitude: session.currentLon },
        6,
        t("awaitingGnss")
    );

    const resolvedFlight = useMemo(
        () => (session.flightId ? flights.find((f) => f.id === session.flightId) : undefined),
        [flights, session.flightId]
    );
    const effectiveDroneId = session.droneId || resolvedFlight?.droneId;
    const resolvedDroneLabel = useMemo(() => {
        if (!effectiveDroneId) return null;
        const found = drones.find((d) => d.id === effectiveDroneId);
        return (
            found?.registrationNumber ||
            found?.model ||
            `DRN-${effectiveDroneId.slice(0, 8).toUpperCase()}`
        );
    }, [drones, effectiveDroneId]);

    const tabs: readonly UnderlineTabItem<TabType>[] = [
        { id: "telemetry", label: t("tabTelemetry"), count: records.length },
        { id: "events", label: t("tabEvents"), count: events.length },
        { id: "specs", label: t("tabSpecs") },
    ];

    return (
        <div className="flex flex-col gap-4 w-full">
            <UnderlineTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                ariaLabel={t("tabsAria")}
            />

            <ChamferCard size="lg" className="w-full">
                {activeTab === "telemetry" && (
                    <div className="p-0">
                        {records.length === 0 ? (
                            <EmptyState
                                compact
                                icon={Satellite}
                                title={t("emptyTelemetryTitle")}
                                description={t("emptyTelemetryDesc")}
                            />
                        ) : (
                            <Table fixed={false} wrapperClassName="max-h-[420px] overflow-y-auto">
                                <TableHeader className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                                    <TableRow>
                                        <TableHead>{t("colTime")}</TableHead>
                                        <TableHead>{t("colCoords")}</TableHead>
                                        <TableHead>{t("colAltitude")}</TableHead>
                                        <TableHead>{t("colSpeed")}</TableHead>
                                        <TableHead>{t("colHeading")}</TableHead>
                                        <TableHead>{t("colBattery")}</TableHead>
                                        <TableHead align="right">{t("colStream")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100 font-mono text-xs">
                                    {records.map((rec, index) => {
                                        const coords = formatCoordinates(rec, 6);
                                        const alt = formatAltitude(rec.altitude);
                                        const spd =
                                            rec.speed != null ? `${rec.speed.toFixed(1)} m/s` : "—";
                                        const hdg =
                                            rec.heading != null
                                                ? `${rec.heading.toFixed(0)}°`
                                                : "—";
                                        const bat =
                                            rec.batteryPercentage != null
                                                ? `${rec.batteryPercentage.toFixed(1)}%`
                                                : "—";
                                        const isFirst = index === 0;

                                        return (
                                            <TableRow
                                                key={rec.id || index}
                                                className={`transition-colors hover:bg-slate-50 ${isFirst ? "bg-slate-50/80" : ""}`}
                                            >
                                                <TableCell mono muted>
                                                    {formatTime(
                                                        rec.timestamp ?? new Date().toISOString()
                                                    )}
                                                </TableCell>
                                                <TableCell mono darkText>
                                                    {coords}
                                                </TableCell>
                                                <TableCell mono darkText>
                                                    {alt}
                                                </TableCell>
                                                <TableCell mono darkText>
                                                    {spd}
                                                </TableCell>
                                                <TableCell mono darkText>
                                                    {hdg}
                                                </TableCell>
                                                <TableCell mono bold>
                                                    <span
                                                        className={
                                                            (rec.batteryPercentage ?? 100) < 20
                                                                ? "text-red-600"
                                                                : (rec.batteryPercentage ?? 100) <
                                                                    50
                                                                  ? "text-amber-600"
                                                                  : "text-emerald-600"
                                                        }
                                                    >
                                                        {bat}
                                                    </span>
                                                </TableCell>
                                                <TableCell align="right">
                                                    {isFirst ? (
                                                        <StatusBadge
                                                            status="live"
                                                            dotShape="circle"
                                                        />
                                                    ) : (
                                                        <span className="text-[10px] font-mono text-slate-400">
                                                            {t("sampleTag")}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                )}

                {activeTab === "events" && (
                    <div className="p-4">
                        {events.length === 0 ? (
                            <EmptyState
                                compact
                                icon={ScrollText}
                                title={t("emptyEventsTitle")}
                                description={t("emptyEventsDesc")}
                            />
                        ) : (
                            <div className="flex flex-col divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                                {[...events].reverse().map((evt, idx) => {
                                    const timeStr = formatTime(evt.createdOn);
                                    return (
                                        <div
                                            key={evt.id || idx}
                                            className="py-2.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-mono font-semibold text-slate-400 shrink-0 tabular-nums">
                                                    {timeStr}
                                                </span>
                                                <StatusBadge
                                                    status={evt.severity || "info"}
                                                    dotShape="circle"
                                                />
                                                {evt.scenario && (
                                                    <span className="text-[11px] font-mono text-slate-500 uppercase">
                                                        [{evt.scenario}]
                                                    </span>
                                                )}
                                                <span className="text-xs font-mono text-slate-800">
                                                    {evt.message || evt.type || t("eventFallback")}
                                                </span>
                                            </div>

                                            {evt.type && (
                                                <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0">
                                                    {evt.type}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "specs" && (
                    <div className="p-4 flex flex-col divide-y divide-slate-100 font-mono text-xs">
                        <div className="py-2.5 first:pt-0 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                {t("flightPlan")}
                            </span>
                            <div className="flex items-center gap-2">
                                {session.flightId ? (
                                    <>
                                        <Link
                                            href={`/dashboard/flights/${session.flightId}`}
                                            className="font-bold text-slate-800 hover:text-slate-600 hover:underline transition-colors flex items-center gap-1"
                                            title={session.flightId}
                                        >
                                            <span>
                                                {resolvedFlight?.flightNumber ||
                                                    `FLT-${session.flightId.slice(0, 8).toUpperCase()}`}
                                            </span>
                                            <ExternalLink className="w-3 h-3 text-slate-400" />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleCopy(
                                                    session.flightId || "",
                                                    "flightId",
                                                    t("flightPlanIdField")
                                                )
                                            }
                                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                            title={t("copyFlightPlanUuid")}
                                            aria-label={t("copyFlightPlanUuid")}
                                        >
                                            {copiedField === "flightId" ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <span className="text-slate-400">—</span>
                                )}
                            </div>
                        </div>

                        <div className="py-2.5 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                {t("targetAircraft")}
                            </span>
                            <div className="flex items-center gap-2">
                                {effectiveDroneId ? (
                                    <>
                                        <Link
                                            href="/dashboard/drones"
                                            className="font-bold text-slate-800 hover:text-slate-600 hover:underline transition-colors flex items-center gap-1"
                                            title={effectiveDroneId}
                                        >
                                            <span>{resolvedDroneLabel}</span>
                                            <ExternalLink className="w-3 h-3 text-slate-400" />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleCopy(
                                                    effectiveDroneId,
                                                    "droneId",
                                                    t("droneIdField")
                                                )
                                            }
                                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                            title={t("copyDroneUuid")}
                                            aria-label={t("copyDroneUuid")}
                                        >
                                            {copiedField === "droneId" ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <span className="text-slate-400">{t("autoAssigned")}</span>
                                )}
                            </div>
                        </div>

                        <div className="py-2.5 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                {t("gnssPosition")}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-700 font-medium">{latLonText}</span>
                                {session.currentLat != null && session.currentLon != null && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleCopy(latLonText, "coords", t("coordsField"))
                                        }
                                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                        title={t("copyCoords")}
                                        aria-label={t("copyCoords")}
                                    >
                                        {copiedField === "coords" ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="py-2.5 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                {t("corridorSegment")}
                            </span>
                            <span className="font-bold text-slate-800">
                                {isCompleted
                                    ? t("reachedDestination")
                                    : session.currentSegment != null
                                      ? t("activeSegment", { num: session.currentSegment })
                                      : t("nominalTrajectory")}
                            </span>
                        </div>

                        <div className="py-2.5 last:pb-0 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                {t("timeScale")}
                            </span>
                            <span className="font-bold text-slate-800">
                                {session.timeScale != null ? `${session.timeScale}x` : "1.0x"}
                            </span>
                        </div>
                    </div>
                )}
            </ChamferCard>
        </div>
    );
}
