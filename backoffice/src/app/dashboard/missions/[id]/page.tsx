"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useHubsAll, useDronesAll, useMissionDetail, QUERY_KEYS } from "@/hooks";
import { missionService } from "@/services/missionService";
import { syncMissionWaypoints, MissionEditor, type MissionSaveData } from "@/components/missions";
import { EmptyState, PageEditorSkeleton } from "@/components/ui";
import type { UpdateMissionPayload } from "@/types";

export default function EditMissionPage() {
    const router = useRouter();
    const params = useParams();
    const queryClient = useQueryClient();
    const missionId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

    const { data: hubs = [], isLoading: hubsLoading } = useHubsAll();
    const { data: drones = [], isLoading: dronesLoading } = useDronesAll();

    const {
        data: mission,
        isLoading: missionLoading,
        error: missionError,
    } = useMissionDetail(missionId);

    const updateMutation = useMutation({
        mutationFn: async ({ payload, waypoints, defaultAltitude }: MissionSaveData) => {
            const depHub = hubs.find((h) => h.id === mission?.departureHubId) ?? null;
            const arrHub = hubs.find((h) => h.id === mission?.arrivalHubId) ?? null;
            await missionService.updateMission(missionId, payload as UpdateMissionPayload);
            await syncMissionWaypoints(
                missionId,
                mission?.waypoints ?? [],
                waypoints,
                defaultAltitude,
                depHub,
                arrHub
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions });
            toast.success("Mission updated successfully");
            router.push("/dashboard/missions");
        },
        meta: { defaultErrorMessage: "Failed to save mission" },
    });

    if (missionLoading || hubsLoading || dronesLoading) {
        return <PageEditorSkeleton />;
    }

    if (missionError || !mission) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-8">
                <EmptyState
                    icon={AlertCircle}
                    title="Mission Not Found"
                    description={
                        missionError instanceof Error
                            ? missionError.message
                            : "The requested mission profile does not exist or may have been removed."
                    }
                    action={{
                        label: "Back to Missions Management",
                        onClick: () => router.push("/dashboard/missions"),
                        icon: ArrowLeft,
                        variant: "chamfer",
                    }}
                />
            </div>
        );
    }

    return (
        <MissionEditor
            mode="edit"
            initialData={mission}
            hubs={hubs}
            drones={drones}
            onSave={async (data) => {
                await updateMutation.mutateAsync(data);
            }}
            loading={updateMutation.isPending}
        />
    );
}
