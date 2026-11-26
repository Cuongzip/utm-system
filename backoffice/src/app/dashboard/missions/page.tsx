"use client";

import { useState, useCallback, useMemo, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCw } from "lucide-react";
import { toast } from "sonner";
import {
    PageHeader,
    ChamferButton,
    TableFilterBar,
    ErrorState,
    type SelectOption,
} from "@/components/ui";
import { MissionsTable, ExecuteMissionModal } from "@/components/missions";
import { missionService } from "@/services/missionService";
import { useCrudList, useHubsAll, QUERY_KEYS } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStatusOptions } from "@/utils";
import { MISSION_STATUS, MISSION_STATUSES, MISSION_STATUS_LABELS, type Mission } from "@/types";

const STATUS_OPTIONS: SelectOption[] = createStatusOptions(MISSION_STATUSES, MISSION_STATUS_LABELS);

function missionStatusPriority(status?: string): number {
    const s = (status || "").toLowerCase();
    if (s === MISSION_STATUS.EXECUTING || s === MISSION_STATUS.PAUSED) return 0;
    if (
        s === MISSION_STATUS.SCHEDULED ||
        s === MISSION_STATUS.READY ||
        s === MISSION_STATUS.DRAFT
    ) {
        return 1;
    }
    return 2;
}

export default function MissionsPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data: hubs = [] } = useHubsAll();

    const [searchQuery, setSearchQuery] = useState("");
    const deferredSearch = useDeferredValue(searchQuery);
    const [statusFilter, setStatusFilter] = useState("all");
    const [missionToExecute, setMissionToExecute] = useState<Mission | null>(null);

    const fetchMissions = useCallback(() => missionService.getMissions({ size: 100 }), []);

    const {
        items: missions,
        loading,
        isError,
        refresh,
    } = useCrudList<Mission>({
        queryKey: QUERY_KEYS.missions,
        fetchFn: fetchMissions,
        entityName: "Mission",
    });

    const hubMap = useMemo(
        () => new Map(hubs.filter((h) => h.id).map((h) => [h.id, h.name || h.code || h.id])),
        [hubs]
    );

    const hasFilters = Boolean(searchQuery.trim()) || statusFilter !== "all";

    const clearFilters = useCallback(() => {
        setSearchQuery("");
        setStatusFilter("all");
    }, []);

    const filteredMissions = useMemo(() => {
        const query = deferredSearch.toLowerCase().trim();
        const status = statusFilter.toLowerCase();
        return [...missions]
            .filter((m) => {
                const matchesSearch =
                    !query ||
                    (m.name || "").toLowerCase().includes(query) ||
                    (m.description && m.description.toLowerCase().includes(query)) ||
                    (m.code && m.code.toLowerCase().includes(query));

                const matchesStatus = status === "all" || (m.status || "").toLowerCase() === status;

                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                const prio = missionStatusPriority(a.status) - missionStatusPriority(b.status);
                if (prio !== 0) return prio;
                const tA = new Date(a.createdOn || 0).getTime();
                const tB = new Date(b.createdOn || 0).getTime();
                return tB - tA;
            });
    }, [missions, deferredSearch, statusFilter]);

    const scheduleMissionMutation = useMutation({
        mutationFn: (mission: Mission) => missionService.scheduleMission(mission.id),
        onSuccess: (_data, mission) => {
            toast.success(`Mission "${mission.name || mission.id}" scheduled for dispatch`);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions });
        },
        meta: { defaultErrorMessage: "Failed to schedule mission" },
    });

    const unscheduleMissionMutation = useMutation({
        mutationFn: (mission: Mission) => missionService.unscheduleMission(mission.id),
        onSuccess: (_data, mission) => {
            toast.success(`Mission "${mission.name || mission.id}" reverted to draft`);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions });
        },
        meta: { defaultErrorMessage: "Failed to unschedule mission" },
    });

    const duplicateMissionMutation = useMutation({
        mutationFn: (mission: Mission) => missionService.duplicateMission(mission.id),
        onSuccess: (_data, mission) => {
            toast.success(`Mission "${mission.name || mission.id}" duplicated as draft`);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions });
        },
        meta: { defaultErrorMessage: "Failed to duplicate mission" },
    });

    const deleteMissionMutation = useMutation({
        mutationFn: (mission: Mission) => missionService.deleteMission(mission.id),
        onSuccess: (_data, mission) => {
            toast.success(`Mission "${mission.name || mission.id}" deleted successfully`);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions });
        },
        meta: { defaultErrorMessage: "Failed to delete mission" },
    });

    const handleExecute = (mission: Mission) => {
        setMissionToExecute(mission);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-5 w-full">
            <PageHeader title="MISSION PLANNING">
                <ChamferButton
                    variant="outline"
                    size="sm"
                    clip="xs"
                    onClick={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions })}
                >
                    <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Refresh</span>
                </ChamferButton>

                <ChamferButton
                    variant="dark"
                    size="sm"
                    onClick={() => router.push("/dashboard/missions/new")}
                >
                    <Plus className="w-4 h-4 text-white" />
                    <span>New Mission</span>
                </ChamferButton>
            </PageHeader>

            <TableFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search mission code or name..."
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                statusOptions={STATUS_OPTIONS}
                onClearFilters={clearFilters}
                totalCount={missions.length}
                filteredCount={filteredMissions.length}
            />

            {isError && missions.length === 0 ? (
                <ErrorState
                    title="Unable to load missions"
                    description="The Mission Service could not be reached. Please try again."
                    onRetry={refresh}
                />
            ) : (
                <MissionsTable
                    missions={filteredMissions}
                    loading={loading}
                    hasFilters={hasFilters}
                    onClearFilters={clearFilters}
                    onSelectMission={(m) => router.push(`/dashboard/missions/${m.id}`)}
                    onExecuteMission={handleExecute}
                    onScheduleMission={scheduleMissionMutation.mutate}
                    onUnscheduleMission={unscheduleMissionMutation.mutate}
                    onDuplicateMission={duplicateMissionMutation.mutate}
                    onDeleteMission={deleteMissionMutation.mutate}
                    onNewMission={() => router.push("/dashboard/missions/new")}
                    hubMap={hubMap}
                />
            )}

            <ExecuteMissionModal
                isOpen={Boolean(missionToExecute)}
                mission={missionToExecute}
                onClose={() => setMissionToExecute(null)}
            />
        </div>
    );
}
