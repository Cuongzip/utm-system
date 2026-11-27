"use client";

import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Satellite, ZapOff, WifiOff, TriangleAlert, ShieldAlert, Loader2 } from "lucide-react";
import { ChamferCard, ChamferButton, StatusBadge } from "@/components/ui";
import { cn } from "@/lib";
import { simulationService } from "@/services/simulationService";
import { QUERY_KEYS } from "@/hooks";
import { toast } from "sonner";
import {
    SIMULATION_STATUS,
    SIMULATION_SCENARIO,
    type SimulationSession,
    type InjectScenarioType,
} from "@/types";

export interface SessionChaosPanelProps {
    session: SimulationSession;
    onScenarioInjected: () => void;
}

export interface ScenarioDefinition {
    type: InjectScenarioType;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

export const CHAOS_SCENARIOS: ScenarioDefinition[] = [
    {
        type: SIMULATION_SCENARIO.GPS_FAILURE,
        name: "GPS Failure",
        description: "Simulates complete loss of GNSS positioning.",
        icon: Satellite,
    },
    {
        type: SIMULATION_SCENARIO.BATTERY_DRAIN,
        name: "Battery Drain",
        description: "Forces rapid battery level depletion.",
        icon: ZapOff,
    },
    {
        type: SIMULATION_SCENARIO.C2_LOST,
        name: "C2 Link Lost",
        description: "Simulates lost C2 command telemetry link.",
        icon: WifiOff,
    },
    {
        type: SIMULATION_SCENARIO.MOTOR_FAILURE,
        name: "Motor Failure",
        description: "Simulates propulsion motor subsystem fault.",
        icon: TriangleAlert,
    },
    {
        type: SIMULATION_SCENARIO.GEOFENCE_BREACH,
        name: "Geofence Breach",
        description: "Forces flight outside authorized airspace boundaries.",
        icon: ShieldAlert,
    },
];

export function SessionChaosPanel({ session, onScenarioInjected }: SessionChaosPanelProps) {
    const t = useTranslations("simulation.chaos");
    const tScenarios = useTranslations("simulation.scenarios");
    const normStatus = String(session.status || "").toLowerCase();
    const isRunning = normStatus === SIMULATION_STATUS.RUNNING;
    const activeScenario = session.activeScenario;

    const queryClient = useQueryClient();
    const injectMutation = useMutation({
        mutationFn: (scenario: ScenarioDefinition) =>
            simulationService.injectScenario(session.id, { scenario: scenario.type }),
        onSuccess: (_data, scenario) => {
            toast.success(t("injectedToast", { name: tScenarios(`${scenario.type}.name`) }));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationEvents(session.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationDetail(session.id) });
            onScenarioInjected();
        },
        meta: { defaultErrorMessage: t("injectError") },
    });

    const clearMutation = useMutation({
        mutationFn: () => simulationService.clearScenario(session.id),
        onSuccess: () => {
            toast.success(t("clearedToast"));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationEvents(session.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationDetail(session.id) });
            onScenarioInjected();
        },
        meta: { defaultErrorMessage: t("clearError") },
    });

    const handleAction = (scenario: ScenarioDefinition, isThisActive: boolean) => {
        if (!isRunning) {
            toast.error(t("mustBeRunningToast"));
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
        <ChamferCard size="md" className="w-full" innerClassName="overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[var(--color-border-default)] flex items-center justify-between gap-2 bg-[var(--color-surface-subtle)]">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    {t("heading")}
                </span>
                {!isRunning && (
                    <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                        {t("mustBeRunningHint")}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-[var(--color-border-default)]">
                {CHAOS_SCENARIOS.map((sc) => {
                    const Icon = sc.icon;
                    const scenarioName = tScenarios(`${sc.type}.name`);
                    const isThisInjecting =
                        injectMutation.isPending && injectMutation.variables?.type === sc.type;
                    const isThisActive = activeScenario?.toLowerCase() === sc.type.toLowerCase();
                    const isThisClearing = clearMutation.isPending && isThisActive;

                    return (
                        <div
                            key={sc.type}
                            className={cn(
                                "p-3.5 flex flex-col justify-between gap-3 transition-colors",
                                isThisActive ? "bg-amber-50/40" : "bg-[var(--color-surface-panel)]"
                            )}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Icon
                                        className={cn(
                                            "w-4 h-4 shrink-0",
                                            isThisActive ? "text-amber-600" : "text-slate-500"
                                        )}
                                    />
                                    <span className="text-xs font-mono font-bold text-slate-900 truncate">
                                        {scenarioName}
                                    </span>
                                </div>
                                {isThisActive && (
                                    <StatusBadge
                                        status="alert"
                                        label={t("activeBadge")}
                                        dotShape="circle"
                                    />
                                )}
                            </div>

                            <ChamferButton
                                size="xs"
                                variant={isThisActive ? "dark" : "outline"}
                                disabled={!isRunning || isActionPending}
                                onClick={() => handleAction(sc, isThisActive)}
                                className="w-full"
                            >
                                {isThisInjecting || isThisClearing ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : isThisActive ? (
                                    <span>{t("clearFault")}</span>
                                ) : (
                                    <span>{t("inject")}</span>
                                )}
                            </ChamferButton>
                        </div>
                    );
                })}
            </div>
        </ChamferCard>
    );
}
