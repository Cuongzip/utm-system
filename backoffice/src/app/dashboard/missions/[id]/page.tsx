"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { useHubsAll, useDronesAll, QUERY_KEYS } from "@/hooks";
import { missionService } from "@/services/missionService";
import { syncMissionWaypoints, MissionEditor, type MissionSaveData } from "@/components/missions";
import { EmptyState } from "@/components/ui";
import type { UpdateMissionPayload } from "@/types";

export default function EditMissionPage() {
    const router = useRouter();
    const params = useParams();
    const missionId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

    const { data: hubs = [], isLoading: hubsLoading } = useHubsAll();
    const { data: drones = [], isLoading: dronesLoading } = useDronesAll();

    const {
        data: mission,
        isLoading: missionLoading,
        error: missionError,
    } = useQuery({
        queryKey: [...QUERY_KEYS.missions, "detail", missionId],
        queryFn: () => missionService.getById(missionId),
        enabled: Boolean(missionId),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ payload, waypoints, defaultAltitude }: MissionSaveData) => {
            await missionService.updateMission(missionId, payload as UpdateMissionPayload);
            await syncMissionWaypoints(
                missionId,
                mission?.waypoints || [],
                waypoints,
                defaultAltitude
            );
        },
        onSuccess: () => {
            toast.success("Mission updated successfully");
            router.push("/dashboard/missions");
        },
        meta: { defaultErrorMessage: "Failed to save mission" },
    });

    if (missionLoading || hubsLoading || dronesLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
                <p className="text-xs font-mono text-[var(--color-text-muted)]">
                    Loading mission details...
                </p>
            </div>
        );
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
