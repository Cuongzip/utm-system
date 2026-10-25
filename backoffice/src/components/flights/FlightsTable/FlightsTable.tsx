"use client";

import { useState } from "react";
import { PlaneTakeoff, MapPin, Play, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
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
    TableEmpty,
} from "@/components/ui";
import type { Flight } from "@/types";
import { formatDateTime } from "@/utils";

export interface FlightsTableProps {
    flights: Flight[];
    loading?: boolean;
    selectedFlightId?: string | null;
    onSelectFlight?: (flight: Flight) => void;
    onAuthorizeFlight?: (flight: Flight) => void;
    onStartFlight?: (flight: Flight) => void;
    onCompleteFlight?: (flight: Flight) => void;
    onAbortFlight?: (flight: Flight) => void;
    onNewFlight?: () => void;
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

    const getActions = (flight: Flight): ActionMenuItem[] => {
        const items: ActionMenuItem[] = [
            {
                label: "View on Map",
                icon: <MapPin className="w-3.5 h-3.5 text-[var(--color-border-dark)]" />,
                onClick: () => onSelectFlight?.(flight),
            },
        ];

        const status = (flight.status || "planned").toLowerCase();

        if (status === "planned" || status === "scheduled") {
            if (onAuthorizeFlight) {
                items.push({
                    label: "Authorize Flight",
                    icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />,
                    onClick: () => onAuthorizeFlight(flight),
                });
            }
        }

        if (status === "planned" || status === "scheduled" || status === "authorized") {
            if (onStartFlight) {
                items.push({
                    label: "Start Flight",
                    icon: <Play className="w-3.5 h-3.5 text-emerald-600" />,
                    onClick: () => onStartFlight(flight),
                });
            }
        }

        if (status === "active" || status === "in_flight") {
            if (onCompleteFlight) {
                items.push({
                    label: "Complete Flight",
                    icon: <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />,
                    onClick: () => onCompleteFlight(flight),
                });
            }
        }

        if (status !== "completed" && status !== "cancelled" && status !== "aborted") {
            if (onAbortFlight) {
                items.push({
                    label: "Abort Flight",
                    icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
                    danger: true,
                    onClick: () => setFlightToAbort(flight),
                });
            }
        }

        return items;
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            <ChamferCard size="lg" accent="dark" className="w-full">
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
                            <TableEmpty
                                colSpan={7}
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
                        ) : (
                            flights.map((flight) => {
                                const isSelected = selectedFlightId === flight.id;
                                const flightNum =
                                    flight.flightNumber ||
                                    `DRP-${flight.id.slice(0, 6).toUpperCase()}`;

                                const droneName =
                                    (flight as any).drone?.registrationNumber ||
                                    (flight as any).drone?.model ||
                                    (flight.droneId
                                        ? droneMap.get(flight.droneId) || flight.droneId.slice(0, 8)
                                        : "—");

                                const depName =
                                    (flight as any).departureHub?.name ||
                                    (flight.departureHubId
                                        ? hubMap.get(flight.departureHubId) || flight.departureHubId
                                        : "—");

                                const arrName =
                                    (flight as any).arrivalHub?.name ||
                                    (flight.arrivalHubId
                                        ? hubMap.get(flight.arrivalHubId) || flight.arrivalHubId
                                        : "—");

                                const departureTime = formatDateTime(
                                    (flight as any).plannedDeparture || flight.scheduledDeparture,
                                    "MMM dd, HH:mm"
                                );

                                return (
                                    <TableRow
                                        key={flight.id}
                                        selected={isSelected}
                                        onClick={() => onSelectFlight?.(flight)}
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
                                                status={flight.status || "planned"}
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
            </ChamferCard>

            <ConfirmDialog
                isOpen={!!flightToAbort}
                onClose={() => setFlightToAbort(null)}
                onConfirm={() => {
                    if (flightToAbort && onAbortFlight) {
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

export default FlightsTable;
