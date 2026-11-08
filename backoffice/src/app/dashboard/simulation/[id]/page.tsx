"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ChamferButton, StatusBadge, EmptyState, PageHeader } from "@/components/ui";
import {
    SessionControlsPanel,
    SessionTelemetryCards,
    SessionChaosPanel,
    SessionLiveFeed,
} from "@/components/simulation";
import { simulationService } from "@/services/simulationService";
import { QUERY_KEYS } from "@/hooks";
import { SIMULATION_STATUS, DEFAULT_SIMULATION_STATUS } from "@/types";

interface SimulationDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function SimulationDetailPage({ params }: SimulationDetailPageProps) {
    const { id } = use(params);
    const router = useRouter();

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

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                    <span className="text-xs font-mono text-slate-500">
                        Loading simulation session...
                    </span>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
                <EmptyState
                    title="Simulation session not found"
                    description={`No simulation session found with ID: ${id}`}
                />
                <ChamferButton
                    variant="outline"
                    size="sm"
                    clip="xs"
                    onClick={() => router.push("/dashboard/simulation")}
                >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    <span>Back to Simulations</span>
                </ChamferButton>
            </div>
        );
    }

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader
                title={`SESSION: ${session.id}`}
                badges={
                    <StatusBadge status={session.status ?? DEFAULT_SIMULATION_STATUS} showDot />
                }
            >
                <ChamferButton
                    variant="outline"
                    size="sm"
                    clip="xs"
                    onClick={() => router.push("/dashboard/simulation")}
                >
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                    <span>Back to Sessions</span>
                </ChamferButton>
            </PageHeader>

            <SessionControlsPanel session={session} onRefresh={refetch} />

            <SessionTelemetryCards session={session} />

            <SessionChaosPanel session={session} onScenarioInjected={refetch} />

            <SessionLiveFeed session={session} />
        </div>
    );
}
