"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCw } from "lucide-react";
import { toast } from "sonner";
import {
    PageHeader,
    ChamferButton,
    OutlineButton,
    SearchInput,
    AlertBanner,
} from "@/components/ui";
import { MissionsTable } from "@/components/missions";
import { missionService } from "@/services/missionService";
import { hubService } from "@/services/hubService";
import { droneService } from "@/services/droneService";
import {
    MISSION_STATUSES,
    MISSION_STATUS_LABELS,
    type Mission,
    type Hub,
    type Drone,
} from "@/types";

export default function MissionsPage() {
    const router = useRouter();
    const [missions, setMissions] = useState<Mission[]>([]);
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [drones, setDrones] = useState<Drone[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const fetchData = useCallback(async () => {
        try {
            const [missionsRes, hubsRes, dronesRes] = await Promise.all([
                missionService.getMissions({ size: 100 }),
                hubService.getHubs({ limit: 0 }),
                droneService.getDrones({ limit: 0 }),
            ]);

            setMissions(missionsRes.items || []);
            setHubs(hubsRes.items || []);
            setDrones(dronesRes.items || []);
            setError(null);
        } catch {
            setError("Failed to fetch missions and hub operations data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            if (isMounted) await fetchData();
        })();
        return () => {
            isMounted = false;
        };
    }, [fetchData]);

    const hubMap = useMemo(() => {
        const map = new Map<string, string>();
        hubs.forEach((h) => {
            if (h.id) map.set(h.id, h.name || h.code || h.id);
        });
        return map;
    }, [hubs]);

    const filteredMissions = useMemo(() => {
        return missions.filter((m) => {
            const matchesSearch =
                !searchQuery ||
                (m.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesStatus =
                statusFilter === "all" ||
                (m.status || "").toLowerCase() === statusFilter.toLowerCase();

            return matchesSearch && matchesStatus;
        });
    }, [missions, searchQuery, statusFilter]);

    const handleDuplicate = async (mission: Mission) => {
        try {
            await missionService.duplicateMission(mission.id);
            toast.success(`Mission "${mission.name || mission.id}" duplicated as draft`);
            await fetchData();
        } catch {
            toast.error("Failed to duplicate mission");
        }
    };

    const handleDelete = async (mission: Mission) => {
        try {
            await missionService.deleteMission(mission.id);
            toast.success(`Mission "${mission.name || mission.id}" deleted successfully`);
            await fetchData();
        } catch {
            toast.error("Failed to delete mission");
        }
    };

    const handleExecute = async (mission: Mission) => {
        try {
            const droneIdToUse = drones[0]?.id;
            if (!droneIdToUse) {
                toast.error("No active drone found to execute this mission");
                return;
            }
            await missionService.executeMission(mission.id, {
                droneId: droneIdToUse,
                pilotId: "operator",
            });
            toast.success(`Mission "${mission.name || mission.id}" is now executing`);
            await fetchData();
        } catch {
            toast.error("Failed to start mission execution");
        }
    };

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader title="MISSION PLANNING">
                <OutlineButton
                    size="sm"
                    onClick={() => {
                        setLoading(true);
                        void fetchData();
                    }}
                >
                    <RotateCw className="w-3.5 h-3.5 text-[var(--color-border-dark)]" />
                    <span>Refresh</span>
                </OutlineButton>

                <ChamferButton
                    variant="dark"
                    size="sm"
                    onClick={() => router.push("/dashboard/missions/new")}
                >
                    <Plus className="w-4 h-4 text-white" />
                    <span>New Mission</span>
                </ChamferButton>
            </PageHeader>

            {error && <AlertBanner message={error} onDismiss={() => setError(null)} />}

            <div className="flex items-center gap-3">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search missions..."
                    className="w-72"
                />

                <div className="w-44">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full h-[34px] px-3 border border-[var(--color-border-strong)] rounded-md text-xs bg-[var(--color-surface-panel)] text-[var(--color-text-primary)] font-medium focus:outline-hidden focus:border-[var(--color-border-dark)] cursor-pointer"
                    >
                        <option value="all">All Statuses</option>
                        {MISSION_STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {MISSION_STATUS_LABELS[status]}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <MissionsTable
                missions={filteredMissions}
                loading={loading}
                onSelectMission={(m) => router.push(`/dashboard/missions/${m.id}`)}
                onExecuteMission={handleExecute}
                onDuplicateMission={handleDuplicate}
                onDeleteMission={handleDelete}
                onNewMission={() => router.push("/dashboard/missions/new")}
                hubMap={hubMap}
            />
        </div>
    );
}
