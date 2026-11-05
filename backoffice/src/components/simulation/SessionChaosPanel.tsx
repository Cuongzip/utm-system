"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Satellite,
    ZapOff,
    WifiOff,
    TriangleAlert,
    ShieldAlert,
    Loader2,
    Flame,
} from "lucide-react";
import { ChamferCard, StatusBadge } from "@/components/ui";
import { simulationService } from "@/services/simulationService";
import { QUERY_KEYS } from "@/hooks";
import { toast } from "sonner";
import type { SimulationSession, InjectScenarioPayload } from "@/types";

export interface SessionChaosPanelProps {
    session: SimulationSession;
    onScenarioInjected?: () => void;
}

export interface ScenarioDefinition {
    type: InjectScenarioPayload["scenario"];
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    badgeColor: string;
}

export const CHAOS_SCENARIOS: ScenarioDefinition[] = [
    {
        type: "gps_failure",
        name: "GPS Failure",
        description: "Simulates complete loss of GNSS positioning.",
        icon: Satellite,
        accentColor: "text-amber-500",
        badgeColor: "border-amber-200 bg-amber-50 text-amber-700",
    },
    {
        type: "battery_drain",
        name: "Battery Drain",
        description: "Forces rapid battery level depletion.",
        icon: ZapOff,
        accentColor: "text-red-500",
        badgeColor: "border-red-200 bg-red-50 text-red-700",
    },
    {
        type: "c2_lost",
        name: "C2 Link Lost",
        description: "Simulates lost C2 command telemetry link.",
        icon: WifiOff,
        accentColor: "text-orange-500",
        badgeColor: "border-orange-200 bg-orange-50 text-orange-700",
    },
    {
        type: "motor_failure",
        name: "Motor Failure",
        description: "Simulates propulsion motor subsystem fault.",
        icon: TriangleAlert,
        accentColor: "text-red-600",
        badgeColor: "border-red-300 bg-red-100 text-red-800",
    },
    {
        type: "geofence_breach",
        name: "Geofence Breach",
        description: "Forces flight outside authorized airspace boundaries.",
        icon: ShieldAlert,
        accentColor: "text-purple-500",
        badgeColor: "border-purple-200 bg-purple-50 text-purple-700",
    },
];

export function SessionChaosPanel({ session, onScenarioInjected }: SessionChaosPanelProps) {
    const normStatus = String(session.status || "").toLowerCase();
    const isRunning = normStatus === "running";
    const activeScenario = session.activeScenario;

    const queryClient = useQueryClient();
    const injectMutation = useMutation({
        mutationFn: (scenario: ScenarioDefinition) =>
            simulationService.injectScenario(session.id, { scenario: scenario.type }),
        onSuccess: (_data, scenario) => {
            toast.success(`Injected scenario: ${scenario.name}`);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationEvents(session.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationDetail(session.id) });
            onScenarioInjected?.();
        },
        meta: { defaultErrorMessage: "Failed to inject emergency scenario" },
    });

    const handleInject = (scenario: ScenarioDefinition) => {
        if (!isRunning) {
            toast.error("Simulation session must be RUNNING to inject emergency scenarios");
            return;
        }
        injectMutation.mutate(scenario);
    };

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm font-bold tracking-wider text-slate-800 uppercase font-mono">
                        EMERGENCY SCENARIO INJECTION
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500 uppercase">
                        Active Scenario:
                    </span>
                    {activeScenario ? (
                        <StatusBadge
                            status={activeScenario}
                            label={activeScenario.toUpperCase()}
                            dotShape="circle"
                        />
                    ) : (
                        <StatusBadge status="offline" label="NONE" dotShape="circle" />
                    )}
                </div>
            </div>

            <ChamferCard size="lg" className="w-full">
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {CHAOS_SCENARIOS.map((sc) => {
                        const Icon = sc.icon;
                        const isThisInjecting =
                            injectMutation.isPending && injectMutation.variables?.type === sc.type;
                        const isThisActive =
                            activeScenario?.toLowerCase() === sc.type.toLowerCase();

                        return (
                            <div
                                key={sc.type}
                                className={`flex flex-col justify-between p-3.5 rounded-lg border transition-all ${
                                    isThisActive
                                        ? "border-red-400 bg-red-50/50 shadow-xs"
                                        : "border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300"
                                }`}
                            >
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div
                                            className={`w-8 h-8 rounded-md flex items-center justify-center bg-white border border-slate-200 shadow-2xs ${sc.accentColor}`}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        {isThisActive && (
                                            <StatusBadge
                                                status="alert"
                                                label="ACTIVE"
                                                dotShape="circle"
                                            />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-900 font-mono tracking-tight">
                                            {sc.name}
                                        </span>
                                        <span className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                                            {sc.description}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3.5 pt-2.5 border-t border-slate-200/80">
                                    <button
                                        type="button"
                                        disabled={!isRunning || injectMutation.isPending}
                                        onClick={() => handleInject(sc)}
                                        className={`w-full h-7 px-2 text-[11px] font-mono font-bold rounded flex items-center justify-center gap-1.5 transition-all border ${
                                            !isRunning
                                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                                : isThisActive
                                                  ? "bg-red-600 text-white border-red-700 hover:bg-red-700 cursor-pointer shadow-2xs"
                                                  : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100 hover:border-slate-400 cursor-pointer shadow-2xs active:scale-98"
                                        }`}
                                    >
                                        {isThisInjecting ? (
                                            <Loader2 className="w-3 h-3 animate-spin text-slate-600" />
                                        ) : (
                                            <span>Inject</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ChamferCard>
        </div>
    );
}

export default SessionChaosPanel;
