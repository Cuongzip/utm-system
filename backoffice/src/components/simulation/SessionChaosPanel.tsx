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

    const clearMutation = useMutation({
        mutationFn: () => simulationService.clearScenario(session.id),
        onSuccess: () => {
            toast.success("Emergency scenario cleared. Restored normal flight.");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationEvents(session.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationDetail(session.id) });
            onScenarioInjected();
        },
        meta: { defaultErrorMessage: "Failed to clear emergency scenario" },
    });

    const handleAction = (scenario: ScenarioDefinition, isThisActive: boolean) => {
        if (!isRunning) {
            toast.error("Simulation session must be RUNNING to control emergency scenarios");
            return;
        }
        if (isThisActive) {
            clearMutation.mutate();
        } else {
            injectMutation.mutate(scenario);
        }
    };

    const isActionPending = injectMutation.isPending || clearMutation.isPending;

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-wider text-slate-800 uppercase font-mono">
                    EMERGENCY SCENARIO INJECTION
                </h2>
                {activeScenario && (
                    <ChamferButton
                        size="xs"
                        variant="danger"
                        disabled={!isRunning || isActionPending}
                        onClick={() => clearMutation.mutate()}
                    >
                        {clearMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                            <TriangleAlert className="w-3 h-3 mr-1" />
                        )}
                        <span>Clear Scenario</span>
                    </ChamferButton>
                )}
            </div>

            {activeScenario && (
                <div className="flex items-center justify-between p-3 px-4 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-900">
                    <div className="flex items-center gap-2">
                        <TriangleAlert className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-xs font-mono font-bold uppercase">
                            ACTIVE SCENARIO:{" "}
                            <span className="text-rose-600">
                                {CHAOS_SCENARIOS.find(
                                    (s) => s.type.toLowerCase() === activeScenario.toLowerCase()
                                )?.name || activeScenario}
                            </span>
                        </span>
                    </div>
                    <span className="text-xs font-mono text-amber-700">
                        Flight in emergency failsafe mode. Click &apos;Clear Scenario&apos; to
                        restore cruise flight.
                    </span>
                </div>
            )}

            <ChamferCard size="lg" className="w-full">
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {CHAOS_SCENARIOS.map((sc) => {
                        const Icon = sc.icon;
                        const isThisInjecting =
                            injectMutation.isPending && injectMutation.variables?.type === sc.type;
                        const isThisActive =
                            activeScenario?.toLowerCase() === sc.type.toLowerCase();
                        const isThisClearing = clearMutation.isPending && isThisActive;

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
                                        disabled={!isRunning || isActionPending}
                                        onClick={() => handleAction(sc, isThisActive)}
                                        className="w-full"
                                    >
                                        {isThisInjecting || isThisClearing ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : isThisActive ? (
                                            <span>Clear Scenario</span>
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
