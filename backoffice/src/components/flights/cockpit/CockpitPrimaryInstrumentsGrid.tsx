"use client";

import { useTranslations } from "next-intl";
import { Compass } from "lucide-react";
import { cn } from "@/lib";
import { formatAltitude } from "@/utils";
import { getCardinalDirectionLabel } from "../routeProgressUtils";

interface CockpitPrimaryInstrumentsGridProps {
    altMsl: number | null;
    altAgl: number | null;
    cruisingAltitudeM: number | null | undefined;
    speedKmh: number | null;
    speedMs: number | null;
    vertSpeed: number | null;
    flightMode: string | null | undefined;
    heading: number | null;
    pitch: number | null;
    roll: number | null;
}

export function CockpitPrimaryInstrumentsGrid({
    altMsl,
    altAgl,
    cruisingAltitudeM,
    speedKmh,
    speedMs,
    vertSpeed,
    flightMode,
    heading,
    pitch,
    roll,
}: CockpitPrimaryInstrumentsGridProps) {
    const t = useTranslations("flights.deck");
    const tCtrl = useTranslations("controlCenter");

    return (
        <div className="grid grid-cols-2 gap-px bg-slate-700/75">
            <div className="bg-slate-900/95 p-2.5 flex flex-col justify-between min-h-[70px]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap truncate">
                    {t("altShortLabel")}
                </span>
                <div>
                    <div className="font-mono text-base font-bold text-white tabular-nums">
                        {altMsl != null ? formatAltitude(Math.round(altMsl)) : "—"}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 tabular-nums truncate">
                        {altAgl != null
                            ? `AGL ${Math.round(altAgl)}m · ${t("planAlt", { alt: Math.round(cruisingAltitudeM ?? 120) })}`
                            : t("planAlt", {
                                  alt: Math.round(cruisingAltitudeM ?? 120),
                              })}
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/95 p-2.5 flex flex-col justify-between min-h-[70px]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap truncate">
                    {tCtrl("groundSpeed")}
                </span>
                <div>
                    <div className="font-mono text-base font-bold text-white tabular-nums">
                        {speedKmh != null ? `${speedKmh} km/h` : "—"}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                        {speedMs != null ? `${speedMs.toFixed(1)} m/s` : "—"}
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/95 p-2.5 flex flex-col justify-between min-h-[70px]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap truncate">
                    {t("verticalSpeed")}
                </span>
                <div>
                    <div
                        className={cn(
                            "font-mono text-base font-bold tabular-nums",
                            vertSpeed != null && vertSpeed <= -5 ? "text-red-400" : "text-white"
                        )}
                    >
                        {vertSpeed != null
                            ? `${vertSpeed > 0 ? "+" : ""}${vertSpeed.toFixed(1)} m/s`
                            : "—"}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">
                        {flightMode ? flightMode.replace(/_/g, " ") : "—"}
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/95 p-2.5 flex flex-col justify-between min-h-[70px]">
                <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap truncate">
                        {t("headingShortLabel")}
                    </span>
                    {heading != null && (
                        <Compass
                            className="w-3.5 h-3.5 text-slate-400 transition-transform duration-300 shrink-0"
                            style={{ transform: `rotate(${heading}deg)` }}
                            aria-hidden="true"
                        />
                    )}
                </div>
                <div>
                    <div className="font-mono text-base font-bold text-white tabular-nums">
                        {heading != null
                            ? `${String(heading).padStart(3, "0")}° ${getCardinalDirectionLabel(heading)}`
                            : "—"}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 tabular-nums truncate">
                        {pitch != null || roll != null
                            ? `P ${pitch != null ? `${pitch.toFixed(1)}°` : "0°"} · R ${roll != null ? `${roll.toFixed(1)}°` : "0°"}`
                            : "P — · R —"}
                    </div>
                </div>
            </div>
        </div>
    );
}
