"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle } from "lucide-react";
import {
    ChamferButton,
    ChamferCard,
    KpiStrip,
    StatusBadge,
    EmptyState,
    PageHeader,
    Skeleton,
} from "@/components/ui";
import {
    SessionControlsPanel,
    SessionTelemetryCards,
    SessionChaosPanel,
    SessionLiveFeed,
} from "@/components/simulation";
import { simulationService } from "@/services/simulationService";
import { QUERY_KEYS, useFlightsAll } from "@/hooks";
import { SIMULATION_STATUS, DEFAULT_SIMULATION_STATUS } from "@/types";

interface SimulationDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function SimulationDetailPage({ params }: SimulationDetailPageProps) {
    const { id } = use(params);
    const t = useTranslations("simulation.detail");
    const tCards = useTranslations("simulation.telemetryCards");
    const router = useRouter();
    const { data: flights = [] } = useFlightsAll();

    const {
        data: session,
        isLoading,
        refetch,
    } = useQuery({
        queryKey: QUERY_KEYS.simulationDetail(id),
        queryFn: () => simulationService.getById(id),
        enabled: Boolean(id),
        refetchInterval: (query) => {
            const status = String(query.state.data?.status || "").toLowerCase();
            return status === SIMULATION_STATUS.RUNNING ? 2000 : false;
        },
    });

    const flightNumber = session?.flightId
        ? (flights.find((f) => f.id === session.flightId)?.flightNumber ?? null)
        : null;

    if (isLoading) {
        return (
            <div
                role="status"
                aria-busy="true"
                aria-label={t("loadingAria")}
                className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 w-full"
            >
                <div className="flex items-center justify-between">
                    <Skeleton className="h-7 w-56" />
                    <Skeleton className="h-9 w-28" />
                </div>
                <KpiStrip
                    loading
                    items={[
                        { id: "bat", label: tCards("battery"), value: "—" },
                        { id: "spd", label: tCards("groundSpeed"), value: "—" },
                        { id: "alt", label: tCards("altitudeHeading"), value: "—" },
                        { id: "traj", label: tCards("trajectory"), value: "—" },
                    ]}
                />
                <ChamferCard size="lg">
                    <div className="p-5 flex flex-col gap-3">
                        <Skeleton className="h-5 w-44" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </ChamferCard>
                <span className="sr-only">{t("loadingSr")}</span>
            </div>
        );
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
