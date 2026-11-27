"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { PlayCircle, Pause, Play, Square, Trash2, Eye, AlertTriangle, Search } from "lucide-react";
import {
    ChamferCard,
    StatusBadge,
    ActionMenu,
    type ActionMenuItem,
    ConfirmDialog,
    TableFilterBar,
    type SelectOption,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableLoading,
    EmptyState,
    Pagination,
} from "@/components/ui";
import { InjectScenarioModal } from "./InjectScenarioModal";
import { useFlightsAll, useDronesAll, usePagination } from "@/hooks";
import { formatDistance, createStatusOptions, compareCreatedDesc } from "@/utils";
import {
    SIMULATION_STATUS,
    SIMULATION_SESSION_STATUSES,
    DEFAULT_SIMULATION_STATUS,
    type SimulationSession,
} from "@/types";

interface SimulationTableProps {
    sessions: SimulationSession[];
    loading: boolean;
    onPauseSession: (id: string) => void;
    onResumeSession: (id: string) => void;
    onStopSession: (id: string) => void;
    onDeleteSession: (id: string) => void;
    onRefresh: () => void;
}

export function SimulationTable({
    sessions = [],
    loading = false,
    onPauseSession,
    onResumeSession,
    onStopSession,
    onDeleteSession,
    onRefresh,
}: SimulationTableProps) {
    const t = useTranslations("simulation.table");
    const tCommon = useTranslations("common");
    const router = useRouter();
    const { data: flights = [] } = useFlightsAll();
    const { data: drones = [] } = useDronesAll();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sessionToDelete, setSessionToDelete] = useState<SimulationSession | null>(null);
    const [sessionForInject, setSessionForInject] = useState<SimulationSession | null>(null);

    const statusOptions: SelectOption[] = createStatusOptions(SIMULATION_SESSION_STATUSES);

    const flightMap = useMemo(
        () => new Map(flights.filter((f) => f.id).map((f) => [f.id, f])),
        [flights]
    );

    const droneMap = useMemo(
        () =>
            new Map(
                drones
                    .filter((d) => d.id)
                    .map((d) => [d.id, d.registrationNumber || d.model || d.id])
            ),
        [drones]
    );

    const filteredSessions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return [...sessions]
            .filter((s) => {
                if (statusFilter !== "all") {
                    const norm = String(s.status || "").toLowerCase();
                    if (norm !== statusFilter.toLowerCase()) return false;
                }
                if (!q) return true;
                const flight = s.flightId ? flightMap.get(s.flightId) : undefined;
                const flightNum = flight?.flightNumber || s.flightId || "";
                const effectiveDroneId = s.droneId || flight?.droneId;
                const droneReg = effectiveDroneId ? droneMap.get(effectiveDroneId) || "" : "";
                return (
                    s.id.toLowerCase().includes(q) ||
                    flightNum.toLowerCase().includes(q) ||
                    droneReg.toLowerCase().includes(q)
                );
            })
            .sort(compareCreatedDesc);
    }, [sessions, statusFilter, searchQuery, flightMap, droneMap]);

    const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all";
    const clearFilters = () => {
        setSearchQuery("");
        setStatusFilter("all");
    };

    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(filteredSessions);

    const getActions = (session: SimulationSession): ActionMenuItem[] => {
        const items: ActionMenuItem[] = [
            {
                label: t("viewDetails"),
                icon: <Eye className="w-3.5 h-3.5 text-slate-600" />,
                onClick: () => router.push(`/dashboard/simulation/${session.id}`),
            },
        ];
        const normStatus = String(session.status || "").toLowerCase();

        if (normStatus === SIMULATION_STATUS.RUNNING) {
            items.push(
                {
                    label: t("injectScenario"),
                    icon: <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />,
                    onClick: () => setSessionForInject(session),
                },
                {
                    label: t("pause"),
                    icon: <Pause className="w-3.5 h-3.5 text-slate-500" />,
                    onClick: () => onPauseSession(session.id),
                },
                {
                    label: t("stop"),
                    icon: <Square className="w-3.5 h-3.5 text-slate-500" />,
                    onClick: () => onStopSession(session.id),
                }
            );
        } else if (normStatus === SIMULATION_STATUS.PAUSED) {
            items.push(
                {
                    label: t("resume"),
                    icon: <Play className="w-3.5 h-3.5 text-slate-500" />,
                    onClick: () => onResumeSession(session.id),
                },
                {
                    label: t("stop"),
                    icon: <Square className="w-3.5 h-3.5 text-slate-500" />,
                    onClick: () => onStopSession(session.id),
                }
            );
        }

        items.push({
            label: tCommon("delete"),
            icon: <Trash2 className="w-3.5 h-3.5" />,
            danger: true,
            onClick: () => setSessionToDelete(session),
        });

        return items;
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            <TableFilterBar
                searchPlaceholder={t("searchPlaceholder")}
                searchQuery={searchQuery}
                onSearchChange={(val) => {
                    setSearchQuery(val);
                    setCurrentPage(1);
                }}
                statusFilter={statusFilter}
                onStatusFilterChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                }}
                statusOptions={statusOptions}
                onClearFilters={hasActiveFilters ? clearFilters : undefined}
                totalCount={sessions.length}
                filteredCount={filteredSessions.length}
                itemLabel={t("itemLabel")}
            />

            <ChamferCard size="lg" className="w-full">
                <Table fixed={false}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("colFlightSession")}</TableHead>
                            <TableHead>{t("colDrone")}</TableHead>
                            <TableHead>{t("colStatus")}</TableHead>
                            <TableHead>{t("colSpeedScale")}</TableHead>
                            <TableHead>{t("colBattery")}</TableHead>
                            <TableHead>{t("colProgress")}</TableHead>
                            <TableHead align="right">{t("colActions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={7} message={t("loading")} />
                        ) : filteredSessions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-10 text-center">
                                    {hasActiveFilters ? (
                                        <EmptyState
                                            icon={Search}
                                            title={t("emptyFilteredTitle")}
                                            description={t("emptyFilteredDesc")}
                                            action={{
                                                label: t("clearFilters"),
                                                onClick: clearFilters,
                                                variant: "outline",
                                            }}
                                        />
                                    ) : (
                                        <EmptyState
                                            icon={PlayCircle}
                                            title={t("emptyTitle")}
                                            description={t("emptyDesc")}
                                        />
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((session) => {
                                const flight = session.flightId
                                    ? flightMap.get(session.flightId)
                                    : undefined;
                                const flightNumText =
                                    flight?.flightNumber ||
                                    (session.flightId
                                        ? `FLT-${session.flightId.slice(0, 8).toUpperCase()}`
                                        : "—");
                                const shortSessionTag = session.id
                                    ? `SIM-${session.id.slice(0, 6).toUpperCase()}`
                                    : "—";

                                const effectiveDroneId = session.droneId || flight?.droneId;
                                const droneRegText = effectiveDroneId
                                    ? droneMap.get(effectiveDroneId) ||
                                      `DRN-${effectiveDroneId.slice(0, 8).toUpperCase()}`
                                    : "—";

                                const speedScaleText = `${(session.speed ?? 15).toFixed(1)} m/s (${(session.timeScale ?? 1).toFixed(1)}x)`;

                                const battery = session.currentBattery ?? 100;
                                const batteryColor =
                                    battery > 50
                                        ? "text-emerald-600 font-semibold"
                                        : battery > 20
                                          ? "text-amber-600 font-semibold"
                                          : "text-red-600 font-semibold";

                                const progress = Math.min(100, Math.max(0, session.progress ?? 0));
                                const distText =
                                    session.traveledDistance != null
                                        ? `${formatDistance(session.traveledDistance)} / ${formatDistance(session.totalDistance ?? 0)}`
                                        : "";

                                return (
                                    <TableRow
                                        key={session.id}
                                        className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                                        onClick={() =>
                                            router.push(`/dashboard/simulation/${session.id}`)
                                        }
                                    >
                                        <TableCell
                                            truncate
                                            className="max-w-[180px]"
                                            tooltip={t("rowTooltip", {
                                                flight: flightNumText,
                                                id: session.id,
                                            })}
                                        >
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-mono font-bold text-slate-900 truncate">
                                                    {flightNumText}
                                                </span>
                                                <span className="text-[11px] font-mono text-slate-400">
                                                    {shortSessionTag}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell
                                            mono
                                            darkText
                                            truncate
                                            className="max-w-[150px]"
                                            tooltip={droneRegText}
                                        >
                                            {droneRegText}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={session.status ?? DEFAULT_SIMULATION_STATUS}
                                            />
                                        </TableCell>
                                        <TableCell mono darkText>
                                            {speedScaleText}
                                        </TableCell>
                                        <TableCell mono>
                                            <span className={batteryColor}>
                                                {battery.toFixed(0)}%
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 w-full min-w-[120px] max-w-[160px]">
                                                <div className="flex justify-between text-[11px] font-mono tabular-nums">
                                                    <span className="text-slate-700 font-medium">
                                                        {progress.toFixed(1)}%
                                                    </span>
                                                    <span className="text-slate-400 text-[10px]">
                                                        {distText}
                                                    </span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-slate-700 rounded-full transition-all duration-300"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ActionMenu items={getActions(session)} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    onPageChange={setCurrentPage}
                    itemLabel={t("itemLabel")}
                />
            </ChamferCard>

            <ConfirmDialog
                isOpen={!!sessionToDelete}
                onClose={() => setSessionToDelete(null)}
                onConfirm={() => {
                    if (sessionToDelete) {
                        onDeleteSession(sessionToDelete.id);
                        setSessionToDelete(null);
                    }
                }}
                title={t("deleteTitle")}
                description={
                    <span>
                        {t("deleteDescPrefix")}
                        <strong className="text-slate-900 font-mono">
                            {sessionToDelete?.id
                                ? `SIM-${sessionToDelete.id.slice(0, 8).toUpperCase()}`
                                : ""}
                        </strong>
                        {t("deleteDescSuffix")}
                    </span>
                }
                confirmText={t("deleteConfirm")}
            />

            {sessionForInject && (
                <InjectScenarioModal
                    isOpen={Boolean(sessionForInject)}
                    sessionId={sessionForInject.id}
                    onClose={() => setSessionForInject(null)}
                    onSuccess={onRefresh}
                />
            )}
        </div>
    );
}
