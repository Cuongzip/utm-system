"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Satellite, ZapOff, WifiOff, TriangleAlert, ShieldAlert, Loader2 } from "lucide-react";
import { ChamferCard, ChamferButton, StatusBadge } from "@/components/ui";
import { cn } from "@/lib";
import { simulationService } from "@/services/simulationService";
import { QUERY_KEYS } from "@/hooks";
import { toast } from "sonner";
import { SIMULATION_STATUS, type SimulationSession, type InjectScenarioPayload } from "@/types";

export interface SessionChaosPanelProps {
    session: SimulationSession;
    onScenarioInjected: () => void;
}

export interface ScenarioDefinition {
    type: InjectScenarioPayload["scenario"];
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

export const CHAOS_SCENARIOS: ScenarioDefinition[] = [
    {
        type: "gps_failure",
        name: "GPS Failure",
        description: "Simulates complete loss of GNSS positioning.",
        icon: Satellite,
    },
    {
        type: "battery_drain",
        name: "Battery Drain",
        description: "Forces rapid battery level depletion.",
        icon: ZapOff,
    },
    {
        type: "c2_lost",
        name: "C2 Link Lost",
        description: "Simulates lost C2 command telemetry link.",
        icon: WifiOff,
    },
    {
        type: "motor_failure",
        name: "Motor Failure",
        description: "Simulates propulsion motor subsystem fault.",
        icon: TriangleAlert,
    },
    {
        type: "geofence_breach",
        name: "Geofence Breach",
        description: "Forces flight outside authorized airspace boundaries.",
        icon: ShieldAlert,
    },
];

export function SessionChaosPanel({ session, onScenarioInjected }: SessionChaosPanelProps) {
    const normStatus = String(session.status || "").toLowerCase();
    const isRunning = normStatus === SIMULATION_STATUS.RUNNING;
    const activeScenario = session.activeScenario;

    const queryClient = useQueryClient();
    const injectMutation = useMutation({
        mutationFn: (scenario: ScenarioDefinition) =>
            simulationService.injectScenario(session.id, { scenario: scenario.type }),
        onSuccess: (_data, scenario) => {
            toast.success(`Injected scenario: ${scenario.name}`);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationEvents(session.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationDetail(session.id) });
            onScenarioInjected();
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
                <h2 className="text-sm font-bold tracking-wider text-slate-800 uppercase font-mono">
                    EMERGENCY SCENARIO INJECTION
                </h2>
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
                            <ChamferCard
                                key={sc.type}
                                size="sm"
                                className="w-full flex-1 min-h-[170px]"
                                innerClassName={cn(
                                    "p-3.5 flex flex-col justify-between h-full transition-colors",
                                    isThisActive
                                        ? "bg-red-50/40"
                                        : "bg-[var(--color-surface-panel)]"
                                )}
                            >
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div
                                            className={`w-8 h-8 rounded-md flex items-center justify-center bg-white border shadow-2xs ${
                                                isThisActive
                                                    ? "text-rose-600 border-rose-200"
                                                    : "text-slate-600 border-slate-200"
                                            }`}
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

                                <div className="mt-3.5 pt-2.5 border-t border-[var(--color-border-subtle)]">
                                    <ChamferButton
                                        size="xs"
                                        variant={isThisActive ? "danger" : "outline"}
                                        disabled={!isRunning || injectMutation.isPending}
                                        onClick={() => handleInject(sc)}
                                        className="w-full"
                                    >
                                        {isThisInjecting ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <span>Inject</span>
                                        )}
                                    </ChamferButton>
                                </div>
                            </ChamferCard>
                        );
                    })}
                </div>
            </ChamferCard>
        </div>
    );
}
