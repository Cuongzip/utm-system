"use client";

import { useState } from "react";
import {
    PlaneTakeoff,
    Play,
    CheckCircle2,
    AlertTriangle,
    ShieldCheck,
    Pencil,
    Eye,
} from "lucide-react";
import {
    ChamferCard,
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
    type Flight,
    type FlightStatus,
    type FlightAuthorizationStatus,
} from "@/types";
import { formatDateTime } from "@/utils";

export interface FlightsTableProps {
    flights: Flight[];
    loading?: boolean;
    selectedFlightId?: string | null;
    onSelectFlight: (flight: Flight) => void;
    onAuthorizeFlight: (flight: Flight) => void;
    onStartFlight: (flight: Flight) => void;
    onCompleteFlight: (flight: Flight) => void;
    onAbortFlight: (flight: Flight) => void;
    onNewFlight: () => void;
    hubMap?: Map<string, string>;
    droneMap?: Map<string, string>;
}

export function FlightsTable({
    flights = [],
    loading = false,
    selectedFlightId,
    onSelectFlight,
    onAuthorizeFlight,
    onStartFlight,
    onCompleteFlight,
    onAbortFlight,
    onNewFlight,
    hubMap = new Map(),
    droneMap = new Map(),
}: FlightsTableProps) {
    const [flightToAbort, setFlightToAbort] = useState<Flight | null>(null);
    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(flights);

    const getActions = (flight: Flight): ActionMenuItem[] => {
        const status: FlightStatus = flight.status ?? "planned";
        const authStatus: FlightAuthorizationStatus = flight.authorizationStatus ?? "pending";
        const isEditable = EDITABLE_FLIGHT_STATUSES.includes(status);

        const items: ActionMenuItem[] = [
            {
                label: isEditable ? "Edit Flight Plan" : "View Details",
                icon: isEditable ? (
                    <Pencil className="w-3.5 h-3.5 text-cyan-500" />
                ) : (
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                ),
                onClick: () => onSelectFlight(flight),
            },
        ];

        if ((status === "planned" || status === "scheduled") && authStatus === "pending") {
            items.push({
                label: "Authorize Flight",
                icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />,
                onClick: () => onAuthorizeFlight(flight),
            });
        }

        if (status === "authorized") {
            items.push({
                label: "Start Flight",
                icon: <Play className="w-3.5 h-3.5 text-emerald-600" />,
                onClick: () => onStartFlight(flight),
            });
        }

        if (status === "active") {
            items.push({
                label: "Complete Flight",
                icon: <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />,
                onClick: () => onCompleteFlight(flight),
            });
            items.push({
                label: "Abort Flight",
                icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
                danger: true,
                onClick: () => setFlightToAbort(flight),
            });
        }

        return items;
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            <ChamferCard size="lg" className="w-full">
                <Table fixed>
                    <TableHeader>
                        <TableRow>
                            <TableHead width="180px">FLIGHT NUMBER</TableHead>
                            <TableHead width="160px">DRONE</TableHead>
                            <TableHead width="180px">DEPARTURE HUB</TableHead>
                            <TableHead width="180px">ARRIVAL HUB</TableHead>
                            <TableHead width="130px">STATUS</TableHead>
                            <TableHead width="160px">PLANNED DEPARTURE</TableHead>
                            <TableHead width="100px" align="right">
                                ACTIONS
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={7} message="Loading flight operations..." />
                        ) : flights.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-10 text-center">
                                    <EmptyState
                                        icon={PlaneTakeoff}
                                        title="No flights found"
                                        description="Register a new flight operation or corridor mission"
                                        action={
                                            onNewFlight
                                                ? {
                                                      label: "+ New Flight",
                                                      onClick: onNewFlight,
                                                  }
                                                : undefined
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((flight) => {
                                const isSelected = selectedFlightId === flight.id;
                                const flightNum =
                                    flight.flightNumber ||
                                    `DRP-${flight.id.slice(0, 6).toUpperCase()}`;

                                const droneName = flight.droneId
                                    ? droneMap.get(flight.droneId) || flight.droneId.slice(0, 8)
                                    : "—";

                                const depName = flight.departureHubId
                                    ? hubMap.get(flight.departureHubId) || flight.departureHubId
                                    : "—";

                                const arrName = flight.arrivalHubId
                                    ? hubMap.get(flight.arrivalHubId) || flight.arrivalHubId
                                    : "—";

                                const departureTime = flight.scheduledDeparture
                                    ? formatDateTime(flight.scheduledDeparture, "MMM dd, HH:mm")
                                    : "—";

                                return (
                                    <TableRow
                                        key={flight.id}
                                        selected={isSelected}
                                        onClick={() => onSelectFlight(flight)}
                                    >
                                        <TableCell mono bold truncate tooltip={flightNum}>
                                            {flightNum}
                                        </TableCell>
                                        <TableCell darkText truncate tooltip={droneName}>
                                            {droneName}
                                        </TableCell>
                                        <TableCell muted truncate tooltip={depName}>
                                            {depName}
                                        </TableCell>
                                        <TableCell muted truncate tooltip={arrName}>
                                            {arrName}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={flight.status ?? "planned"}
                                                showDot={true}
                                            />
                                        </TableCell>
                                        <TableCell mono darkText>
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
                title="Abort Flight Operation"
                description={
                    <span>
                        Are you sure you want to abort flight{" "}
                        <strong className="text-slate-900">
                            {flightToAbort?.flightNumber || flightToAbort?.id}
                        </strong>
                        ? The remote pilot will be instructed to initiate immediate contingency
                        landing.
                    </span>
                }
                confirmText="Abort Flight"
                variant="danger"
            />
        </div>
    );
}
