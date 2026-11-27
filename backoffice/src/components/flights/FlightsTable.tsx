"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
    PlaneTakeoff,
    Play,
    CheckCircle2,
    AlertTriangle,
    ShieldCheck,
    FileSearch,
    Pencil,
    Eye,
} from "lucide-react";
import {
    ChamferCard,
    ChamferButton,
    StatusBadge,
    ActionMenu,
    type ActionMenuItem,
    ConfirmDialog,
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
import { usePagination } from "@/hooks";
import {
    EDITABLE_FLIGHT_STATUSES,
    DEFAULT_FLIGHT_STATUS,
    FLIGHT_STATUS,
    FLIGHT_AUTHORIZATION_STATUS,
    type Flight,
    type FlightStatus,
    type FlightAuthorizationStatus,
} from "@/types";
import { formatDateTime, formatHubName } from "@/utils";

export interface FlightsTableProps {
    flights: Flight[];
    loading: boolean;
    canAuthorize: boolean;
    selectedFlightId?: string | null;
    hasFilters?: boolean;
    onClearFilters?: () => void;
    onSelectFlight: (flight: Flight) => void;
    onOpenBriefing: (flight: Flight) => void;
    onAuthorizeFlight: (flight: Flight) => void;
    onStartFlight: (flight: Flight) => void;
    onCompleteFlight: (flight: Flight) => void;
    onAbortFlight: (flight: Flight) => void;
    onNewFlight: () => void;
    hubMap: Map<string, string>;
    droneMap: Map<string, string>;
}

export function FlightsTable({
    flights = [],
    loading = false,
    canAuthorize,
    selectedFlightId,
    hasFilters = false,
    onClearFilters,
    onSelectFlight,
    onOpenBriefing,
    onAuthorizeFlight,
    onStartFlight,
    onCompleteFlight,
    onAbortFlight,
    onNewFlight,
    hubMap = new Map(),
    droneMap = new Map(),
}: FlightsTableProps) {
    const t = useTranslations("flights");
    const [flightToAbort, setFlightToAbort] = useState<Flight | null>(null);
    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(flights);

    const getActions = (flight: Flight): ActionMenuItem[] => {
        const status: FlightStatus = flight.status ?? DEFAULT_FLIGHT_STATUS;
        const authStatus: FlightAuthorizationStatus =
            flight.authorizationStatus ?? FLIGHT_AUTHORIZATION_STATUS.PENDING;
        const isEditable = EDITABLE_FLIGHT_STATUSES.includes(status);

        const items: ActionMenuItem[] = [
            {
                label: isEditable ? t("actions.editPlan") : t("actions.viewDetails"),
                icon: isEditable ? (
                    <Pencil className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                ),
                onClick: () => onSelectFlight(flight),
            },
            {
                label: t("actions.briefing"),
                icon: <FileSearch className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => onOpenBriefing(flight),
            },
        ];

        if (
            canAuthorize &&
            (status === FLIGHT_STATUS.PLANNED || status === FLIGHT_STATUS.SCHEDULED) &&
            authStatus === FLIGHT_AUTHORIZATION_STATUS.PENDING
        ) {
            items.push({
                label: t("actions.authorize"),
                icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => onAuthorizeFlight(flight),
            });
        }

        if (status === FLIGHT_STATUS.AUTHORIZED) {
            items.push({
                label: t("actions.start"),
                icon: <Play className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => onStartFlight(flight),
            });
        }

        if (status === FLIGHT_STATUS.ACTIVE) {
            items.push({
                label: t("actions.complete"),
                icon: <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => onCompleteFlight(flight),
            });
            items.push({
                label: t("actions.abort"),
                icon: <AlertTriangle className="w-3.5 h-3.5" />,
                danger: true,
                onClick: () => setFlightToAbort(flight),
            });
        }

        return items;
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            <ChamferCard size="lg" className="w-full">
                <Table fixed={false}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("table.flightNumber")}</TableHead>
                            <TableHead>{t("table.drone")}</TableHead>
                            <TableHead>{t("table.departureHub")}</TableHead>
                            <TableHead>{t("table.arrivalHub")}</TableHead>
                            <TableHead>{t("table.status")}</TableHead>
                            <TableHead>{t("table.departure")}</TableHead>
                            <TableHead align="right">{t("table.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={7} message={t("table.loading")} />
                        ) : flights.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-10 text-center">
                                    <EmptyState
                                        icon={PlaneTakeoff}
                                        title={
                                            hasFilters ? t("empty.filteredTitle") : t("empty.title")
                                        }
                                        description={
                                            hasFilters ? t("empty.filteredDesc") : t("empty.desc")
                                        }
                                        action={
                                            hasFilters && onClearFilters ? (
                                                <ChamferButton
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={onClearFilters}
                                                >
                                                    {t("empty.clearFilters")}
                                                </ChamferButton>
                                            ) : (
                                                {
                                                    label: t("empty.newFlight"),
                                                    onClick: onNewFlight,
                                                }
                                            )
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((flight) => {
                                const isSelected = selectedFlightId === flight.id;
                                const flightNum = flight.flightNumber || t("unnumbered");

                                const droneName = flight.droneId
                                    ? droneMap.get(flight.droneId) || flight.droneId.slice(0, 8)
                                    : "—";

                                const depName = formatHubName(
                                    undefined,
                                    flight.departureHubId,
                                    hubMap
                                );

                                const arrName = formatHubName(
                                    undefined,
                                    flight.arrivalHubId,
                                    hubMap
                                );

                                const departureTime = flight.scheduledDeparture
                                    ? formatDateTime(flight.scheduledDeparture, "MMM dd, HH:mm")
                                    : "—";

                                return (
                                    <TableRow
                                        key={flight.id}
                                        selected={isSelected}
                                        onClick={() => onSelectFlight(flight)}
                                    >
                                        <TableCell
                                            mono
                                            bold
                                            truncate
                                            className="max-w-[140px]"
                                            tooltip={flightNum}
                                        >
                                            {flightNum}
                                        </TableCell>
                                        <TableCell
                                            darkText
                                            truncate
                                            className="max-w-[130px]"
                                            tooltip={droneName}
                                        >
                                            {droneName}
                                        </TableCell>
                                        <TableCell
                                            muted
                                            truncate
                                            className="max-w-[165px]"
                                            tooltip={depName}
                                        >
                                            {depName}
                                        </TableCell>
                                        <TableCell
                                            muted
                                            truncate
                                            className="max-w-[165px]"
                                            tooltip={arrName}
                                        >
                                            {arrName}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={flight.status ?? DEFAULT_FLIGHT_STATUS}
                                                showDot={true}
                                            />
                                        </TableCell>
                                        <TableCell mono darkText className="whitespace-nowrap">
                                            {departureTime}
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ActionMenu items={getActions(flight)} />
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
                isOpen={Boolean(flightToAbort)}
                onClose={() => setFlightToAbort(null)}
                onConfirm={() => {
                    if (flightToAbort) {
                        onAbortFlight(flightToAbort);
                        setFlightToAbort(null);
                    }
                }}
                title={t("abortDialog.title")}
                description={
                    <span>
                        {t("abortDialog.descBefore")}{" "}
                        <strong className="text-slate-900">
                            {flightToAbort?.flightNumber || flightToAbort?.id}
                        </strong>
                        {t("abortDialog.descAfter")}
                    </span>
                }
                confirmText={t("abortDialog.confirm")}
            />
        </div>
    );
}
