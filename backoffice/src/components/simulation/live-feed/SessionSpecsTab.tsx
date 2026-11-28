"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useCopyFeedback, useDronesAll, useFlightsAll } from "@/hooks";
import { formatCoordinates } from "@/utils";
import { SIMULATION_STATUS, type SimulationSession } from "@/types";

interface SessionSpecsTabProps {
    session: SimulationSession;
}

type SpecCopyKey = "flightId" | "droneId" | "coords";

export function SessionSpecsTab({ session }: SessionSpecsTabProps) {
    const t = useTranslations("simulation.liveFeed");
    const { data: flights = [] } = useFlightsAll();
    const { data: drones = [] } = useDronesAll();
    const { copiedKey: copiedField, copyWithFeedback } = useCopyFeedback<SpecCopyKey>(1800);

    const handleCopy = async (text: string, fieldKey: SpecCopyKey, fieldLabel: string) => {
        if (!text) return;
        const ok = await copyWithFeedback(fieldKey, text);
        if (ok) {
            toast.success(t("copiedToast", { field: fieldLabel }));
        }
    };

    const normStatus = String(session.status || "").toLowerCase();
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

    return (
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
                                    handleCopy(effectiveDroneId, "droneId", t("droneIdField"))
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
                            onClick={() => handleCopy(latLonText, "coords", t("coordsField"))}
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
    );
}
