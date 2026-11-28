"use client";

import { memo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
    ArrowLeft,
    AlertTriangle,
    ShieldCheck,
    FileSearch,
    Maximize,
    Radio,
    RefreshCw,
} from "lucide-react";
import { StatusBadge } from "@/components/ui";
import { AlertCenterTrigger } from "@/components/alerts";
import { cn } from "@/lib";
import type { LegEtaProgress } from "../routeProgressUtils";
import {
    ACTIVE_FLIGHT_STATUSES,
    CONFORMANCE_STATUS,
    DEFAULT_FLIGHT_STATUS,
    FLIGHT_AUTHORIZATION_STATUS,
    FLIGHT_STATUS,
    type Drone,
    type Flight,
    type FlightConformance,
    type Hub,
    type TelemetryRecord,
} from "@/types";

export interface CockpitTopBarProps {
    flight: Flight;
    drone: Drone | null;
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    telemetry: TelemetryRecord | null;
    isFresh: boolean;
    conformance?: FlightConformance | null;
    isEvaluatingConformance: boolean;
    onEvaluateConformance: () => void;
    legProgress: LegEtaProgress | null;
    followUav: boolean;
    onToggleFollowUav: () => void;
    onFitRoute: () => void;
    filterAirspace: boolean;
    onToggleAirspace: () => void;
    filterHubs: boolean;
    onToggleHubs: () => void;
    filterAdsb: boolean;
    adsbCount?: number;
    onToggleAdsb: () => void;
    onOpenBriefing: () => void;
    canAuthorize: boolean;
    isLifecycleBusy: boolean;
    onAuthorize: () => void;
    onAbort: () => void;
}

export const CockpitTopBar = memo(function CockpitTopBar({
    flight,
    drone,
    departureHub,
    arrivalHub,
    telemetry,
    isFresh,
    conformance,
    isEvaluatingConformance,
    onEvaluateConformance,
    legProgress,
    followUav,
    onToggleFollowUav,
    onFitRoute,
    filterAirspace,
    onToggleAirspace,
    filterHubs,
    onToggleHubs,
    filterAdsb,
    adsbCount,
    onToggleAdsb,
    onOpenBriefing,
    canAuthorize,
    isLifecycleBusy,
    onAuthorize,
    onAbort,
}: CockpitTopBarProps) {
    const t = useTranslations("flights");
    const td = useTranslations("flights.deck");
    const tCtrl = useTranslations("controlCenter");

    const flightStatus = flight.status ?? DEFAULT_FLIGHT_STATUS;
    const authStatus = flight.authorizationStatus ?? FLIGHT_AUTHORIZATION_STATUS.PENDING;
    const isAirborne = ACTIVE_FLIGHT_STATUSES.includes(flightStatus);
    const canAuthorizeNow = Boolean(
        canAuthorize &&
        (flightStatus === FLIGHT_STATUS.PLANNED || flightStatus === FLIGHT_STATUS.SCHEDULED) &&
        authStatus === FLIGHT_AUTHORIZATION_STATUS.PENDING
    );

    const conformanceStatus =
        conformance?.status ?? flight.conformanceStatus ?? CONFORMANCE_STATUS.UNKNOWN;
    const xteM = conformance?.crossTrackErrorM ?? 0;
    const corridorM = conformance?.corridorRadiusM ?? 15;
    const vertErrM = conformance?.verticalErrorM ?? 0;
    const vertBufM = conformance?.altitudeBufferM ?? 10;

    const linkStatus = isFresh
        ? "live"
        : flightStatus === FLIGHT_STATUS.AUTHORIZED
          ? "standby"
          : "offline";

    const depCode = departureHub?.code || departureHub?.name;
    const arrCode = arrivalHub?.code || arrivalHub?.name;

    return (
        <header className="h-12 px-3 bg-slate-900 border-b border-slate-700/85 text-slate-100 flex items-center justify-between gap-2 shrink-0 z-20 select-none overflow-x-auto utm-scroll">
            <div className="flex items-center gap-2 min-w-0 shrink-0">
                <Link
                    href={`/dashboard/flights/${flight.id}`}
                    className="h-7 px-2.5 rounded border border-slate-700 bg-slate-800/85 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0 no-underline whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">{td("exitToDossier")}</span>
                </Link>

                <h1 className="font-mono text-sm font-bold text-white tracking-wide whitespace-nowrap">
                    {flight.flightNumber || flight.id}
                </h1>

                <StatusBadge status={flightStatus} tone="dark" showDot />

                {drone?.registrationNumber && (
                    <span className="hidden md:inline-flex px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-[11px] font-mono font-semibold text-slate-200 whitespace-nowrap shrink-0">
                        {drone.registrationNumber}
                    </span>
                )}

                {depCode && arrCode && (
                    <span className="hidden 2xl:inline-flex items-center gap-1.5 pl-2 border-l border-slate-700 text-[11px] font-mono text-slate-300 whitespace-nowrap">
                        <span className="font-semibold text-slate-200">
                            {depCode} → {arrCode}
                        </span>
                        {isAirborne && legProgress && (
                            <span className="text-slate-400 tabular-nums">
                                · {legProgress.progressPct}%
                                {legProgress.etaMinutes != null
                                    ? ` · ETA ~${legProgress.etaMinutes}m`
                                    : ""}
                            </span>
                        )}
                    </span>
                )}
            </div>

            <div className="hidden lg:flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                <div
                    className="h-7 px-2 rounded border border-slate-700/90 bg-slate-800/75 inline-flex items-center gap-1.5 whitespace-nowrap"
                    title={`XTE ${xteM.toFixed(1)}/${Math.round(corridorM)}m · ΔAlt ${vertErrM.toFixed(1)}/${Math.round(vertBufM)}m`}
                >
                    <span className="text-[10px] font-bold uppercase text-slate-400">4D</span>
                    <StatusBadge status={conformanceStatus} tone="dark" />
                    <span className="hidden 2xl:inline text-slate-300 tabular-nums">
                        {xteM.toFixed(1)}/{Math.round(corridorM)}m · Δ{vertErrM.toFixed(1)}/
                        {Math.round(vertBufM)}m
                    </span>
                    <button
                        type="button"
                        onClick={onEvaluateConformance}
                        disabled={isEvaluatingConformance}
                        title={td("evaluateNow")}
                        aria-label={td("evaluateNow")}
                        className="w-5 h-5 rounded hover:bg-slate-700 inline-flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                        <RefreshCw
                            className={cn("w-3 h-3", isEvaluatingConformance && "animate-spin")}
                            aria-hidden="true"
                        />
                    </button>
                </div>

                <div className="h-7 px-2 rounded border border-slate-700/90 bg-slate-800/75 inline-flex items-center gap-1.5 tabular-nums whitespace-nowrap">
                    <StatusBadge status={linkStatus} tone="dark" />
                    <span className="hidden xl:inline text-slate-300">
                        {telemetry?.signalStrength != null
                            ? `${Math.round(telemetry.signalStrength)}%`
                            : "—"}
                    </span>
                    <span className="hidden 2xl:inline text-slate-400">
                        ·{" "}
                        {telemetry?.gpsSatellites != null
                            ? `${telemetry.gpsSatellites} SAT`
                            : "— SAT"}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
                <button
                    type="button"
                    aria-pressed={followUav}
                    onClick={onToggleFollowUav}
                    className={cn(
                        "h-7 px-2 rounded text-[11px] font-mono font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                        followUav
                            ? "bg-emerald-600 text-white"
                            : "border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                    )}
                >
                    <Radio className="w-3 h-3" aria-hidden="true" />
                    <span className="hidden xl:inline">{td("followUav")}</span>
                </button>

                <button
                    type="button"
                    onClick={onFitRoute}
                    title={td("fitRoute")}
                    aria-label={td("fitRoute")}
                    className="h-7 px-2 rounded border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-[11px] font-mono font-semibold text-slate-300 hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                    <Maximize className="w-3 h-3" aria-hidden="true" />
                    <span className="hidden xl:inline">{td("fitRoute")}</span>
                </button>

                <div className="hidden md:inline-flex items-center rounded border border-slate-700 bg-slate-800/60 p-0.5">
                    <button
                        type="button"
                        aria-pressed={filterAirspace}
                        onClick={onToggleAirspace}
                        className={cn(
                            "h-6 px-2 rounded-[3px] text-[10px] font-mono font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                            filterAirspace
                                ? "bg-slate-700 text-white"
                                : "text-slate-400 hover:text-slate-200"
                        )}
                    >
                        <span
                            aria-hidden="true"
                            className={cn(
                                "w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0",
                                !filterAirspace && "opacity-40"
                            )}
                        />
                        <span>{tCtrl("layerAirspace")}</span>
                    </button>
                    <button
                        type="button"
                        aria-pressed={filterHubs}
                        onClick={onToggleHubs}
                        className={cn(
                            "h-6 px-2 rounded-[3px] text-[10px] font-mono font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                            filterHubs
                                ? "bg-slate-700 text-white"
                                : "text-slate-400 hover:text-slate-200"
                        )}
                    >
                        <span
                            aria-hidden="true"
                            className={cn(
                                "w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0",
                                !filterHubs && "opacity-40"
                            )}
                        />
                        <span>{tCtrl("layerHubs")}</span>
                    </button>
                    <button
                        type="button"
                        aria-pressed={filterAdsb}
                        onClick={onToggleAdsb}
                        className={cn(
                            "h-6 px-2 rounded-[3px] text-[10px] font-mono font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                            filterAdsb
                                ? "bg-slate-700 text-white"
                                : "text-slate-400 hover:text-slate-200"
                        )}
                    >
                        <span
                            aria-hidden="true"
                            className={cn(
                                "w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0",
                                !filterAdsb && "opacity-40"
                            )}
                        />
                        <span>
                            {tCtrl("layerAdsb")}
                            {filterAdsb && adsbCount !== undefined ? ` (${adsbCount})` : ""}
                        </span>
                    </button>
                </div>

                <div className="inline-flex items-center gap-1.5 pl-1 border-l border-slate-700">
                    <AlertCenterTrigger tone="dark" />

                    <button
                        type="button"
                        onClick={onOpenBriefing}
                        title={t("editor.briefing")}
                        className="h-7 px-2 rounded border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-[11px] font-mono font-semibold text-slate-200 hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                        <FileSearch className="w-3.5 h-3.5" aria-hidden="true" />
                        <span className="hidden xl:inline">{t("editor.briefing")}</span>
                    </button>

                    {canAuthorizeNow && (
                        <button
                            type="button"
                            disabled={isLifecycleBusy}
                            onClick={onAuthorize}
                            className="h-7 px-2.5 rounded border border-emerald-600/60 bg-emerald-600/20 hover:bg-emerald-600/35 text-[11px] font-mono font-bold text-emerald-300 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                        >
                            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{t("editor.authorize")}</span>
                        </button>
                    )}

                    {isAirborne && (
                        <button
                            type="button"
                            disabled={isLifecycleBusy}
                            onClick={onAbort}
                            className="h-7 px-2 rounded border border-red-700/70 bg-red-950/50 hover:bg-red-900/60 text-[11px] font-mono font-semibold text-red-300 inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        >
                            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                            <span className="hidden sm:inline">{t("editor.abort")}</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
});
