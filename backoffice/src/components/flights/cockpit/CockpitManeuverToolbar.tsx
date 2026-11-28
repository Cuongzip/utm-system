"use client";

import { useTranslations } from "next-intl";
import {
    ArrowUpDown,
    CornerUpRight,
    Crosshair,
    Gauge,
    Loader2,
    OctagonAlert,
    PlaneTakeoff,
} from "lucide-react";
import { cn } from "@/lib";
import { COMMAND_TYPE, type CommandType } from "@/types";
import type {
    AirborneCommandButton,
    PendingConfirmState,
    VectorPopoverType,
} from "./useCockpitCommands";

interface CockpitManeuverToolbarProps {
    cruisingAltitudeM: number | null | undefined;
    c2Enabled: boolean;
    isAirborne: boolean;
    showPreTakeoffBar: boolean;
    isTakeoffPending: boolean;
    isSubmitting: boolean;
    pendingCommandType: CommandType | undefined;
    activeCommandType: string | null;
    airborneButtons: AirborneCommandButton[];
    activePopover: VectorPopoverType;
    gotoPickMode: boolean;
    onDispatchDirect: (commandType: CommandType) => void;
    onRequestConfirm: (confirm: PendingConfirmState) => void;
    onToggleVectorPopover: (target: Exclude<VectorPopoverType, null>) => void;
}

export function CockpitManeuverToolbar({
    cruisingAltitudeM,
    c2Enabled,
    isAirborne,
    showPreTakeoffBar,
    isTakeoffPending,
    isSubmitting,
    pendingCommandType,
    activeCommandType,
    airborneButtons,
    activePopover,
    gotoPickMode,
    onDispatchDirect,
    onRequestConfirm,
    onToggleVectorPopover,
}: CockpitManeuverToolbarProps) {
    const t = useTranslations("flights.deck");
    const tCtrl = useTranslations("controlCenter");

    return (
        <div
            role="toolbar"
            aria-label={t("quickManeuvers")}
            className="max-w-[calc(100vw-1.5rem)] overflow-x-auto utm-scroll rounded-lg border border-slate-700/85 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md flex items-center gap-1 whitespace-nowrap"
        >
            {showPreTakeoffBar ? (
                <>
                    <button
                        type="button"
                        disabled={!c2Enabled || isSubmitting}
                        onClick={() => onDispatchDirect(COMMAND_TYPE.TAKEOFF)}
                        className="chamfer-xs h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center gap-2 font-mono text-xs font-bold tracking-wider transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                    >
                        {isTakeoffPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <PlaneTakeoff className="w-4 h-4" aria-hidden="true" />
                        )}
                        <span>{tCtrl("commands.tkof")}</span>
                    </button>

                    <span className="hidden sm:inline-flex px-2.5 text-[11px] font-mono text-slate-300 tabular-nums">
                        {t("launchReadyHint", {
                            alt: Math.round(cruisingAltitudeM ?? 120),
                        })}
                    </span>

                    <div className="w-px h-6 bg-slate-700/85 mx-1 shrink-0" aria-hidden="true" />

                    <button
                        type="button"
                        disabled={!c2Enabled || isSubmitting}
                        onClick={() =>
                            onRequestConfirm({
                                title: tCtrl("confirmDialogs.estopTitle"),
                                description: tCtrl("confirmDialogs.estopDesc"),
                                confirmText: tCtrl("confirmDialogs.estopBtn"),
                                commandType: COMMAND_TYPE.EMERGENCY_STOP,
                            })
                        }
                        className="chamfer-xs h-9 px-3 bg-red-600 hover:bg-red-500 text-white inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wider transition-colors cursor-pointer shrink-0 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                    >
                        <OctagonAlert className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t("dockEstop")}</span>
                    </button>
                </>
            ) : (
                <>
                    {airborneButtons.map((btn) => {
                        const Icon = btn.icon;
                        const isActive = activeCommandType === btn.type;
                        const isPendingThis = isSubmitting && pendingCommandType === btn.type;
                        return (
                            <button
                                key={btn.type}
                                type="button"
                                disabled={btn.disabled || isSubmitting}
                                aria-pressed={isActive}
                                onClick={() => {
                                    if (btn.confirm) {
                                        onRequestConfirm({
                                            ...btn.confirm,
                                            commandType: btn.type,
                                        });
                                    } else {
                                        onDispatchDirect(btn.type);
                                    }
                                }}
                                className={cn(
                                    "h-9 px-2.5 rounded inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wide transition-colors cursor-pointer shrink-0 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                    isActive
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700/80"
                                )}
                            >
                                {isPendingThis || isActive ? (
                                    <Loader2
                                        className="w-3.5 h-3.5 animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <Icon
                                        className="w-3.5 h-3.5 text-slate-300"
                                        aria-hidden="true"
                                    />
                                )}
                                <span>{btn.label}</span>
                            </button>
                        );
                    })}

                    <div className="w-px h-6 bg-slate-700/85 mx-0.5 shrink-0" aria-hidden="true" />

                    <button
                        type="button"
                        disabled={!c2Enabled || !isAirborne}
                        aria-pressed={activePopover === "alt"}
                        onClick={() => onToggleVectorPopover("alt")}
                        className={cn(
                            "h-9 px-2 rounded inline-flex items-center gap-1 font-mono text-[11px] font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                            activePopover === "alt"
                                ? "bg-slate-200 text-slate-950 font-bold"
                                : "bg-slate-800/75 hover:bg-slate-700 text-slate-200 border border-slate-700/80"
                        )}
                    >
                        <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t("dockAlt")}</span>
                    </button>

                    <button
                        type="button"
                        disabled={!c2Enabled || !isAirborne}
                        aria-pressed={activePopover === "speed"}
                        onClick={() => onToggleVectorPopover("speed")}
                        className={cn(
                            "h-9 px-2 rounded inline-flex items-center gap-1 font-mono text-[11px] font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                            activePopover === "speed"
                                ? "bg-slate-200 text-slate-950 font-bold"
                                : "bg-slate-800/75 hover:bg-slate-700 text-slate-200 border border-slate-700/80"
                        )}
                    >
                        <Gauge className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t("dockSpeed")}</span>
                    </button>

                    <button
                        type="button"
                        disabled={!c2Enabled || !isAirborne}
                        aria-pressed={activePopover === "goto" || gotoPickMode}
                        onClick={() => onToggleVectorPopover("goto")}
                        className={cn(
                            "h-9 px-2 rounded inline-flex items-center gap-1 font-mono text-[11px] font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                            activePopover === "goto" || gotoPickMode
                                ? "bg-amber-500 text-slate-950 font-bold"
                                : "bg-slate-800/75 hover:bg-slate-700 text-slate-200 border border-slate-700/80"
                        )}
                    >
                        <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t("dockGoto")}</span>
                    </button>

                    <button
                        type="button"
                        disabled={!c2Enabled || !isAirborne}
                        aria-pressed={activePopover === "divert"}
                        onClick={() => onToggleVectorPopover("divert")}
                        className={cn(
                            "h-9 px-2 rounded inline-flex items-center gap-1 font-mono text-[11px] font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                            activePopover === "divert"
                                ? "bg-slate-200 text-slate-950 font-bold"
                                : "bg-slate-800/75 hover:bg-slate-700 text-slate-200 border border-slate-700/80"
                        )}
                    >
                        <CornerUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t("divertBtn")}</span>
                    </button>

                    <div className="w-px h-6 bg-slate-700/85 mx-0.5 shrink-0" aria-hidden="true" />

                    <button
                        type="button"
                        disabled={!c2Enabled || isSubmitting}
                        onClick={() =>
                            onRequestConfirm({
                                title: tCtrl("confirmDialogs.estopTitle"),
                                description: tCtrl("confirmDialogs.estopDesc"),
                                confirmText: tCtrl("confirmDialogs.estopBtn"),
                                commandType: COMMAND_TYPE.EMERGENCY_STOP,
                            })
                        }
                        className="chamfer-xs h-9 px-2.5 bg-red-600 hover:bg-red-500 text-white inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wider transition-colors cursor-pointer shrink-0 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                    >
                        <OctagonAlert className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t("dockEstop")}</span>
                    </button>
                </>
            )}
        </div>
    );
}
