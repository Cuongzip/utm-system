"use client";

import { useState, useCallback, useMemo, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { useAppLocale } from "@/i18n";
import { missionService } from "@/services/missionService";
import { useCrudList, useHubsAll, QUERY_KEYS } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStatusOptions, compareCreatedDesc } from "@/utils";
import { MISSION_STATUSES, type Mission } from "@/types";

export default function MissionsPage() {
    const router = useRouter();
    const t = useTranslations("missions");
    const tCommon = useTranslations("common");
    useAppLocale();
    const statusOptions: SelectOption[] = createStatusOptions(MISSION_STATUSES);
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
            .sort(compareCreatedDesc);
    }, [missions, deferredSearch, statusFilter]);

    const scheduleMissionMutation = useMutation({
        mutationFn: (mission: Mission) => missionService.scheduleMission(mission.id),
        onSuccess: (_data, mission) => {
            toast.success(t("toasts.scheduled", { name: mission.name || mission.id }));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions });
        },
        meta: { defaultErrorMessage: t("toasts.scheduleFailed") },
    });

    const unscheduleMissionMutation = useMutation({
        mutationFn: (mission: Mission) => missionService.unscheduleMission(mission.id),
        onSuccess: (_data, mission) => {
            toast.success(t("toasts.unscheduled", { name: mission.name || mission.id }));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions });
        },
        meta: { defaultErrorMessage: t("toasts.unscheduleFailed") },
    });

    const duplicateMissionMutation = useMutation({
        mutationFn: (mission: Mission) => missionService.duplicateMission(mission.id),
        onSuccess: (_data, mission) => {
            toast.success(t("toasts.duplicated", { name: mission.name || mission.id }));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions });
        },
        meta: { defaultErrorMessage: t("toasts.duplicateFailed") },
    });

    const deleteMissionMutation = useMutation({
        mutationFn: (mission: Mission) => missionService.deleteMission(mission.id),
        onSuccess: (_data, mission) => {
            toast.success(t("toasts.deleted", { name: mission.name || mission.id }));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions });
        },
        meta: { defaultErrorMessage: t("toasts.deleteFailed") },
    });

    const handleExecute = (mission: Mission) => {
        setMissionToExecute(mission);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-5 w-full">
            <PageHeader title={t("title")}>
                <ChamferButton
                    variant="outline"
                    size="sm"
                    clip="xs"
                    onClick={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions })}
                >
                    <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>{tCommon("refresh")}</span>
                </ChamferButton>

                <ChamferButton
                    variant="dark"
                    size="sm"
                    onClick={() => router.push("/dashboard/missions/new")}
                >
                    <Plus className="w-4 h-4 text-white" />
                    <span>{t("newMission")}</span>
                </ChamferButton>
            </PageHeader>

            <TableFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={t("searchPlaceholder")}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                statusOptions={statusOptions}
                onClearFilters={clearFilters}
                totalCount={missions.length}
                filteredCount={filteredMissions.length}
            />

            {isError && missions.length === 0 ? (
                <ErrorState
                    title={t("loadErrorTitle")}
                    description={t("loadErrorDesc")}
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
