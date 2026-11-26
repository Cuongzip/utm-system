"use client";

import { useMemo, useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Radio, Layers, ShieldAlert, RotateCcw } from "lucide-react";
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
            toast.success("Conflict alert acknowledged");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflicts });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflictsActive });
        },
        meta: { defaultErrorMessage: "Failed to acknowledge conflict" },
    });

    const resolveMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: ResolveConflictPayload }) =>
            conflictService.resolve(id, payload),
        onSuccess: () => {
            toast.success("Conflict marked as resolved");
            setResolvingConflict(null);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflicts });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflictsActive });
        },
        meta: { defaultErrorMessage: "Failed to resolve conflict" },
    });

    const evaluateMutation = useMutation({
        mutationFn: () => conflictService.evaluate(),
        onSuccess: (data) => {
            toast.success(
                `Airspace scan completed: ${data.newConflictsDetected ?? 0} new, ${data.resolvedConflictsCount ?? 0} cleared`
            );
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflicts });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflictsActive });
        },
        meta: { defaultErrorMessage: "Failed to run conflict detection scan" },
    });

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 w-full">
            <PageHeader title="AIRSPACE CONFLICTS">
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
                    />
                    <span>
                        {evaluateMutation.isPending ? "Scanning Airspace..." : "Run Airspace Scan"}
                    </span>
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
                        <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-slate-600" />
                                <span className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
                                    TACTICAL CONFLICT RADAR & AIRSPACE
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    aria-pressed={showLiveTraffic}
                                    onClick={() => setShowLiveTraffic((prev) => !prev)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer rounded ${
                                        showLiveTraffic
                                            ? "bg-slate-800 text-white shadow-xs"
                                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    <Radio className="w-3.5 h-3.5" />
                                    <span>LIVE TRAFFIC</span>
                                </button>

                                <button
                                    type="button"
                                    aria-pressed={showAirspace}
                                    onClick={() => setShowAirspace((prev) => !prev)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer rounded ${
                                        showAirspace
                                            ? "bg-slate-800 text-white shadow-xs"
                                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    <Layers className="w-3.5 h-3.5" />
                                    <span>AIRSPACE</span>
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
                        Active Conflicts
                    </h2>
                    {activeConflicts.length > 0 && (
                        <span className="text-xs font-mono text-slate-500 tabular-nums">
                            {activeConflicts.length} active
                        </span>
                    )}
                </div>

                {isActiveError && activeConflicts.length === 0 ? (
                    <ErrorState
                        compact
                        title="Unable to load active conflicts"
                        description="The Conflict Service did not respond. Retry to check separation status."
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
                        Resolved Conflict History
                    </h2>
                    {resolvedConflicts.length > 0 && (
                        <span className="text-xs font-mono text-slate-500 tabular-nums">
                            {resolvedConflicts.length} resolved
                        </span>
                    )}
                </div>

                {isResolvedError && resolvedConflicts.length === 0 ? (
                    <ErrorState
                        compact
                        title="Unable to load resolved conflict history"
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
