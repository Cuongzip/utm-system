"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { ChamferButton, StatusBadge, EmptyState, PageHeader } from "@/components/ui";
import {
    SessionControlsPanel,
    SessionTelemetryCards,
    SessionChaosPanel,
    SessionLiveFeed,
} from "@/components/simulation";
import { useFlightsAll, useSimulationDetail } from "@/hooks";
import { DEFAULT_SIMULATION_STATUS } from "@/types";
import { SimulationDetailSkeleton } from "./SimulationDetailSkeleton";

export function SimulationDetailClient({ id }: { id: string }) {
    const t = useTranslations("simulation.detail");
    const router = useRouter();
    const { data: flights = [] } = useFlightsAll();

    const { data: session, isLoading, refetch } = useSimulationDetail(id);

    const flightNumber = session?.flightId
        ? (flights.find((f) => f.id === session.flightId)?.flightNumber ?? null)
        : null;

    if (isLoading) {
        return <SimulationDetailSkeleton />;
    }

    if (!session) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-4 sm:p-6 lg:p-8">
                <EmptyState
                    icon={AlertCircle}
                    title={t("notFoundTitle")}
                    description={t("notFoundDesc")}
                    action={{
                        label: t("backToSimulations"),
                        onClick: () => router.push("/dashboard/simulation"),
                        icon: ArrowLeft,
                        variant: "outline",
                    }}
                />
            </div>
        );
    }

    const shortTag = `SIM-${session.id.slice(0, 6).toUpperCase()}`;
    const headerTitle = t("headerTitle", { tag: flightNumber ?? shortTag });

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 w-full">
            <PageHeader
                title={headerTitle}
                badges={
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[var(--color-text-muted)]">
                            {shortTag}
                        </span>
                        <StatusBadge status={session.status ?? DEFAULT_SIMULATION_STATUS} showDot />
                    </div>
                }
            >
                <SessionControlsPanel session={session} onRefresh={refetch} />
                <ChamferButton href="/dashboard/simulation" variant="outline" size="sm" clip="xs">
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                    <span>{t("sessionsBtn")}</span>
                </ChamferButton>
            </PageHeader>

            <SessionTelemetryCards session={session} />

            <SessionChaosPanel session={session} onScenarioInjected={refetch} />

            <SessionLiveFeed session={session} />
        </div>
    );
}
