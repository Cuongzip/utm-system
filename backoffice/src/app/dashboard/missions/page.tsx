"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, ChamferButton, TableFilterBar, type SelectOption } from "@/components/ui";
import { MissionsTable } from "@/components/missions";
import { missionService } from "@/services/missionService";
import { useCrudList, useHubsAll, useDronesAll, QUERY_KEYS } from "@/hooks";
import { useMutation } from "@tanstack/react-query";
import { createStatusOptions } from "@/utils";
import { MISSION_STATUSES, MISSION_STATUS_LABELS, type Mission } from "@/types";

const STATUS_OPTIONS: SelectOption[] = createStatusOptions(MISSION_STATUSES, MISSION_STATUS_LABELS);

export default function MissionsPage() {
    const router = useRouter();
    const { data: hubs = [] } = useHubsAll();
    const { data: drones = [] } = useDronesAll();

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const fetchMissions = useCallback(() => missionService.getMissions({ size: 100 }), []);

    const {
        items: missions,
        loading,
        refresh: fetchData,
    } = useCrudList<Mission>({
        queryKey: QUERY_KEYS.missions,
        fetchFn: fetchMissions,
        entityName: "Mission",
    });

    const hubMap = useMemo(
        () => new Map(hubs.filter((h) => h.id).map((h) => [h.id, h.name || h.code || h.id])),
        [hubs]
    );

    const filteredMissions = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const status = statusFilter.toLowerCase();
        return missions.filter((m) => {
            const matchesSearch =
                !query ||
                (m.name || "").toLowerCase().includes(query) ||
                (m.description && m.description.toLowerCase().includes(query)) ||
                (m.code && m.code.toLowerCase().includes(query));

            const matchesStatus = status === "all" || (m.status || "").toLowerCase() === status;

            return matchesSearch && matchesStatus;
        });
    }, [missions, searchQuery, statusFilter]);

    const duplicateMissionMutation = useMutation({
        mutationFn: (mission: Mission) => missionService.duplicateMission(mission.id),
        onSuccess: (_data, mission) => {
            toast.success(`Mission "${mission.name || mission.id}" duplicated as draft`);
            fetchData();
        },
        meta: { defaultErrorMessage: "Failed to duplicate mission" },
    });

    const deleteMissionMutation = useMutation({
        mutationFn: (mission: Mission) => missionService.deleteMission(mission.id),
        onSuccess: (_data, mission) => {
            toast.success(`Mission "${mission.name || mission.id}" deleted successfully`);
            fetchData();
        },
        meta: { defaultErrorMessage: "Failed to delete mission" },
    });

    const executeMissionMutation = useMutation({
        mutationFn: ({ missionId, droneId }: { missionId: string; droneId: string }) =>
            missionService.executeMission(missionId, {
                droneId,
                pilotId: "operator",
            }),
        onSuccess: () => {
            toast.success("Mission is now executing");
            fetchData();
        },
        meta: { defaultErrorMessage: "Failed to start mission execution" },
    });

    const handleExecute = (mission: Mission) => {
        const droneIdToUse = drones[0]?.id;
        if (!droneIdToUse) {
            toast.error("No active drone found to execute this mission");
            return;
        }
        executeMissionMutation.mutate({ missionId: mission.id, droneId: droneIdToUse });
    };

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader title="MISSION PLANNING">
                <ChamferButton variant="outline" size="sm" clip="xs" onClick={fetchData}>
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
                searchPlaceholder="Search missions..."
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                statusOptions={STATUS_OPTIONS}
            />

            <MissionsTable
                missions={filteredMissions}
                loading={loading}
                onSelectMission={(m) => router.push(`/dashboard/missions/${m.id}`)}
                onExecuteMission={handleExecute}
                onDuplicateMission={duplicateMissionMutation.mutate}
                onDeleteMission={deleteMissionMutation.mutate}
                onNewMission={() => router.push("/dashboard/missions/new")}
                hubMap={hubMap}
            />
        </div>
    );
}
