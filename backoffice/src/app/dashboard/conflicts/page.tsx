"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { PageHeader, ChamferButton, ErrorState } from "@/components/ui";
import {
    TacticalMapContainer,
    FlightsLayer,
    AirspaceLayer,
    ConflictsLayer,
} from "@/components/map";
import {
    ActiveConflictsList,
    ResolvedConflictsTable,
    ResolveConflictModal,
} from "@/components/conflicts";
import { conflictService } from "@/services/conflictService";
import {
    useConflictsActive,
    useConflictsAll,
    useFlightsAll,
    useAirspaceAll,
    usePermissions,
    QUERY_KEYS,
} from "@/hooks";
import {
    AIRSPACE_ZONE_STATUS,
    CONFLICT_STATUS,
    type Conflict,
    type ResolveConflictPayload,
} from "@/types";

export default function ConflictsPage() {
    const t = useTranslations("conflicts");
    const queryClient = useQueryClient();
    const { canResolveConflict } = usePermissions();

    const [showLiveTraffic, setShowLiveTraffic] = useState(true);
    const [showAirspace, setShowAirspace] = useState(true);
    const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
    const [resolvingConflict, setResolvingConflict] = useState<Conflict | null>(null);

    const {
        data: activeConflicts = [],
        isError: isActiveError,
        refetch: refetchActive,
    } = useConflictsActive();
    const {
        data: resolvedConflicts = [],
        isLoading: isLoadingResolved,
        isError: isResolvedError,
        refetch: refetchResolved,
    } = useConflictsAll({
        status: CONFLICT_STATUS.RESOLVED,
    });
    const { data: flights = [] } = useFlightsAll();
    const { data: airspaces = [] } = useAirspaceAll();

    const activeAirspaces = useMemo(
        () => airspaces.filter((z) => z.status === AIRSPACE_ZONE_STATUS.ACTIVE),
        [airspaces]
    );

    const conflictingFlightIds = useMemo(() => {
        const ids = new Set<string>();
        for (const c of activeConflicts) {
            if (c.primaryFlightId) ids.add(c.primaryFlightId);
            if (c.secondaryFlightId) ids.add(c.secondaryFlightId);
        }
        return ids;
    }, [activeConflicts]);

    const acknowledgeMutation = useMutation({
        mutationFn: (id: string) => conflictService.acknowledge(id),
        onSuccess: () => {
            toast.success(t("ackedToast"));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflicts });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflictsActive });
        },
        meta: { defaultErrorMessage: t("ackFailed") },
    });

    const resolveMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: ResolveConflictPayload }) =>
            conflictService.resolve(id, payload),
        onSuccess: () => {
            toast.success(t("resolvedToast"));
            setResolvingConflict(null);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflicts });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflictsActive });
        },
        meta: { defaultErrorMessage: t("resolveFailed") },
    });

    const evaluateMutation = useMutation({
        mutationFn: () => conflictService.evaluate(),
        onSuccess: (data) => {
            toast.success(
                t("scanCompletedToast", {
                    newCount: data.newConflictsDetected ?? 0,
                    clearedCount: data.resolvedConflictsCount ?? 0,
                })
            );
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflicts });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflictsActive });
        },
        meta: { defaultErrorMessage: t("scanFailed") },
    });

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 w-full">
            <PageHeader title={t("title")}>
                <ChamferButton
                    variant="outline"
                    size="sm"
                    clip="xs"
                    onClick={() => evaluateMutation.mutate()}
                    disabled={evaluateMutation.isPending}
                >
                    <RotateCcw
                        className={`w-3.5 h-3.5 text-[#334155] ${
                            evaluateMutation.isPending ? "animate-spin" : ""
                        }`}
                        aria-hidden="true"
                    />
                    <span>{evaluateMutation.isPending ? t("scanning") : t("runScan")}</span>
                </ChamferButton>
            </PageHeader>

            <div className="w-full h-[420px] sm:h-[460px]">
                <TacticalMapContainer
                    initialLayerType="satellite-hybrid"
                    className="w-full"
                    onEntityClick={(entityId) => {
                        if (entityId.startsWith("conflict-marker-")) {
                            setSelectedConflictId(entityId.replace("conflict-marker-", ""));
                        } else if (entityId.startsWith("conflict-drop-")) {
                            setSelectedConflictId(entityId.replace("conflict-drop-", ""));
                        }
                    }}
                    header={
                        <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-panel)]">
                            <span className="text-xs font-bold font-mono tracking-wider text-[var(--color-text-primary)] uppercase">
                                {t("radarHeader")}
                            </span>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    aria-pressed={showLiveTraffic}
                                    onClick={() => setShowLiveTraffic((prev) => !prev)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                                        showLiveTraffic
                                            ? "bg-slate-800 text-white shadow-2xs"
                                            : "border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                                    }`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 ${
                                            !showLiveTraffic ? "opacity-45" : ""
                                        }`}
                                    />
                                    <span>{t("liveTraffic")}</span>
                                </button>

                                <button
                                    type="button"
                                    aria-pressed={showAirspace}
                                    onClick={() => setShowAirspace((prev) => !prev)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                                        showAirspace
                                            ? "bg-slate-800 text-white shadow-2xs"
                                            : "border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                                    }`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 ${
                                            !showAirspace ? "opacity-45" : ""
                                        }`}
                                    />
                                    <span>{t("airspaceLayer")}</span>
                                </button>
                            </div>
                        </div>
                    }
                >
                    {showLiveTraffic && (
                        <FlightsLayer
                            flights={flights}
                            activeOnly
                            highlightedFlightIds={conflictingFlightIds}
                            dimUnselected
                            showRouteLabels="focused"
                        />
                    )}
                    <ConflictsLayer
                        conflicts={activeConflicts}
                        flights={flights}
                        selectedConflictId={selectedConflictId}
                    />
                    {showAirspace && <AirspaceLayer zones={activeAirspaces} />}
                </TacticalMapContainer>
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                        {t("activeHeading")}
                    </h2>
                    {activeConflicts.length > 0 && (
                        <span className="text-xs font-mono text-slate-500 tabular-nums">
                            {t("activeCount", { count: activeConflicts.length })}
                        </span>
                    )}
                </div>

                {isActiveError && activeConflicts.length === 0 ? (
                    <ErrorState
                        compact
                        title={t("activeLoadErrorTitle")}
                        description={t("activeLoadErrorDesc")}
                        onRetry={() => refetchActive()}
                    />
                ) : (
                    <ActiveConflictsList
                        conflicts={activeConflicts}
                        selectedConflictId={selectedConflictId}
                        onSelectConflict={(conflict) => setSelectedConflictId(conflict.id)}
                        onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
                        onResolve={(conflict) => setResolvingConflict(conflict)}
                        isAcknowledging={acknowledgeMutation.isPending}
                        canResolve={canResolveConflict}
                    />
                )}
            </div>

            <div className="flex flex-col gap-3 pt-1">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                        {t("historyHeading")}
                    </h2>
                    {resolvedConflicts.length > 0 && (
                        <span className="text-xs font-mono text-slate-500 tabular-nums">
                            {t("resolvedCount", { count: resolvedConflicts.length })}
                        </span>
                    )}
                </div>

                {isResolvedError && resolvedConflicts.length === 0 ? (
                    <ErrorState
                        compact
                        title={t("historyLoadErrorTitle")}
                        onRetry={() => refetchResolved()}
                    />
                ) : (
                    <ResolvedConflictsTable
                        conflicts={resolvedConflicts}
                        isLoading={isLoadingResolved}
                    />
                )}
            </div>

            <ResolveConflictModal
                isOpen={Boolean(resolvingConflict)}
                conflict={resolvingConflict}
                onClose={() => setResolvingConflict(null)}
                onResolve={(id, payload) => resolveMutation.mutate({ id, payload })}
                isSubmitting={resolveMutation.isPending}
            />
        </div>
    );
}
