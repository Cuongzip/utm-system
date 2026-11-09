"use client";

import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Radio, Layers, ShieldAlert, RotateCcw } from "lucide-react";
import { PageHeader, ChamferButton } from "@/components/ui";
import { TacticalMapContainer, FlightsLayer, AirspaceLayer } from "@/components/map";
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
    QUERY_KEYS,
} from "@/hooks";
import { CONFLICT_STATUS, type Conflict, type ResolveConflictPayload } from "@/types";

export default function ConflictsPage() {
    const queryClient = useQueryClient();

    const [showLiveTraffic, setShowLiveTraffic] = useState(true);
    const [showAirspace, setShowAirspace] = useState(true);
    const [resolvingConflict, setResolvingConflict] = useState<Conflict | null>(null);

    const { data: activeConflicts = [] } = useConflictsActive();
    const { data: resolvedConflicts = [], isLoading: isLoadingResolved } = useConflictsAll({
        status: CONFLICT_STATUS.RESOLVED,
    });
    const { data: flights = [] } = useFlightsAll();
    const { data: airspaces = [] } = useAirspaceAll();

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
        <div className="p-8 flex flex-col gap-6 w-full">
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

            <TacticalMapContainer
                initialLayerType="satellite"
                className="w-full h-[480px]"
                header={
                    <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
                                TACTICAL CONFLICT RADAR & AIRSPACE
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
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
                    <FlightsLayer flights={flights} activeOnly autoFitBounds={false} />
                )}
                {showAirspace && <AirspaceLayer zones={airspaces} autoFitBounds={false} />}
            </TacticalMapContainer>

            <div className="flex flex-col gap-3">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Active Conflicts
                </h2>

                <ActiveConflictsList
                    conflicts={activeConflicts}
                    onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
                    onResolve={(conflict) => setResolvingConflict(conflict)}
                    isAcknowledging={acknowledgeMutation.isPending}
                />
            </div>

            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                        Resolved Conflicts
                    </h2>
                </div>

                <ResolvedConflictsTable
                    conflicts={resolvedConflicts}
                    isLoading={isLoadingResolved}
                />
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
