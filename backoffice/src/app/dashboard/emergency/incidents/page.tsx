"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Filter, RefreshCw, ShieldCheck, ChevronRight, X } from "lucide-react";
import {
    PageHeader,
    ChamferCard,
    ChamferButton,
    CustomSelect,
    StatusBadge,
    EmptyState,
    ErrorState,
    Pagination,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableLoading,
} from "@/components/ui";
import { EmergencyNavTabs } from "@/components/emergency/EmergencyNavTabs";
import { useEmergencyIncidents, useDronesAll, useFlightsAll } from "@/hooks";
import { formatDateTime } from "@/utils";
import {
    EMERGENCY_SEVERITIES,
    EMERGENCY_TYPES,
    INCIDENT_STATUSES,
    RESPONSE_ACTION,
    type EmergencySeverity,
    type EmergencyType,
    type IncidentStatus,
    type IncidentQueryParams,
} from "@/types";

const PAGE_SIZE = 20;
const ALL_VALUE = "__all__";

function formatLabel(value: string) {
    return value.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export default function EmergencyIncidentsPage() {
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState<string>(ALL_VALUE);
    const [severityFilter, setSeverityFilter] = useState<string>(ALL_VALUE);
    const [typeFilter, setTypeFilter] = useState<string>(ALL_VALUE);
    const [page, setPage] = useState(1);

    const queryParams = useMemo<IncidentQueryParams>(() => {
        const params: IncidentQueryParams = {
            limit: PAGE_SIZE,
            offset: (page - 1) * PAGE_SIZE,
        };
        if (statusFilter !== ALL_VALUE) {
            params.status = statusFilter as IncidentStatus;
        }
        if (severityFilter !== ALL_VALUE) {
            params.severity = severityFilter as EmergencySeverity;
        }
        if (typeFilter !== ALL_VALUE) {
            params.type = typeFilter as EmergencyType;
        }
        return params;
    }, [statusFilter, severityFilter, typeFilter, page]);

    const {
        data: incidentPage,
        isLoading,
        isError,
        isFetching,
        refetch,
    } = useEmergencyIncidents(queryParams);
    const { data: drones = [] } = useDronesAll();
    const { data: flights = [] } = useFlightsAll();

    const droneMap = useMemo(
        () =>
            new Map(
                drones
                    .filter((d) => d.id)
                    .map((d) => [d.id, d.registrationNumber || d.model || d.id])
            ),
        [drones]
    );

    const flightMap = useMemo(
        () => new Map(flights.filter((f) => f.id).map((f) => [f.id, f])),
        [flights]
    );

    const statusOptions = useMemo(
        () => [
            { value: ALL_VALUE, label: "All Statuses" },
            ...INCIDENT_STATUSES.map((s) => ({ value: s, label: formatLabel(s) })),
        ],
        []
    );

    const severityOptions = useMemo(
        () => [
            { value: ALL_VALUE, label: "All Severities" },
            ...EMERGENCY_SEVERITIES.map((s) => ({ value: s, label: formatLabel(s) })),
        ],
        []
    );

    const typeOptions = useMemo(
        () => [
            { value: ALL_VALUE, label: "All Types" },
            ...EMERGENCY_TYPES.map((t) => ({ value: t, label: formatLabel(t) })),
        ],
        []
    );

    const incidents = incidentPage?.data ?? [];
    const totalItems = incidentPage?.total ?? incidents.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const hasActiveFilters =
        statusFilter !== ALL_VALUE || severityFilter !== ALL_VALUE || typeFilter !== ALL_VALUE;

    const handleResetFilters = () => {
        setStatusFilter(ALL_VALUE);
        setSeverityFilter(ALL_VALUE);
        setTypeFilter(ALL_VALUE);
        setPage(1);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-5 w-full">
            <PageHeader title="EMERGENCY RESPONSE">
                <ChamferButton
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isFetching}
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                </ChamferButton>
            </PageHeader>

            <EmergencyNavTabs />

            <ChamferCard size="md" className="w-full">
                <div className="p-3.5 flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-600 mr-1">
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                        <span>Filters</span>
                    </div>

                    <div className="w-full sm:w-44">
                        <CustomSelect
                            id="filter-incident-status"
                            ariaLabel="Filter by status"
                            value={statusFilter}
                            onValueChange={(v) => {
                                setStatusFilter(v);
                                setPage(1);
                            }}
                            options={statusOptions}
                            placeholder="Status"
                        />
                    </div>

                    <div className="w-full sm:w-40">
                        <CustomSelect
                            id="filter-incident-severity"
                            ariaLabel="Filter by severity"
                            value={severityFilter}
                            onValueChange={(v) => {
                                setSeverityFilter(v);
                                setPage(1);
                            }}
                            options={severityOptions}
                            placeholder="Severity"
                        />
                    </div>

                    <div className="w-full sm:w-52">
                        <CustomSelect
                            id="filter-incident-type"
                            ariaLabel="Filter by emergency type"
                            value={typeFilter}
                            onValueChange={(v) => {
                                setTypeFilter(v);
                                setPage(1);
                            }}
                            options={typeOptions}
                            placeholder="Emergency Type"
                        />
                    </div>

                    {hasActiveFilters && (
                        <ChamferButton variant="outline" size="xs" onClick={handleResetFilters}>
                            <X className="w-3.5 h-3.5" />
                            <span>Clear</span>
                        </ChamferButton>
                    )}

                    <div className="sm:ml-auto text-xs font-mono text-slate-500 tabular-nums">
                        {totalItems} {totalItems === 1 ? "incident" : "incidents"}
                    </div>
                </div>
            </ChamferCard>

            <ChamferCard size="lg" className="w-full">
                {isError && incidents.length === 0 ? (
                    <ErrorState
                        wrapped={false}
                        title="Unable to load incident history"
                        description="The Emergency Service did not respond. Please try again."
                        onRetry={() => refetch()}
                        retrying={isFetching}
                    />
                ) : !isLoading && incidents.length === 0 ? (
                    <EmptyState
                        icon={ShieldCheck}
                        title={hasActiveFilters ? "No Matching Incidents" : "No Incidents Logged"}
                        description={
                            hasActiveFilters
                                ? "Try clearing or broadening your active filter criteria."
                                : "No emergency incidents have been logged yet."
                        }
                        action={
                            hasActiveFilters ? (
                                <ChamferButton
                                    variant="outline"
                                    size="sm"
                                    onClick={handleResetFilters}
                                >
                                    Clear Filters
                                </ChamferButton>
                            ) : undefined
                        }
                    />
                ) : (
                    <>
                        <Table fixed={false}>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="px-3">INCIDENT</TableHead>
                                    <TableHead className="px-3">TYPE / SUMMARY</TableHead>
                                    <TableHead className="px-3">AIRCRAFT</TableHead>
                                    <TableHead className="px-3">SEVERITY</TableHead>
                                    <TableHead className="px-3">ACTION</TableHead>
                                    <TableHead className="px-3">STATUS</TableHead>
                                    <TableHead className="px-3">DETECTED</TableHead>
                                    <TableHead className="px-3 text-right"> </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableLoading
                                        colSpan={8}
                                        message="Loading incident records..."
                                    />
                                ) : (
                                    incidents.map((incident) => {
                                        const flight = incident.flightId
                                            ? flightMap.get(incident.flightId)
                                            : undefined;
                                        const effectiveDroneId =
                                            incident.droneId || flight?.droneId;
                                        const droneLabel = effectiveDroneId
                                            ? droneMap.get(effectiveDroneId) ||
                                              (effectiveDroneId.length > 12
                                                  ? `DRN-${effectiveDroneId.slice(0, 8).toUpperCase()}`
                                                  : effectiveDroneId)
                                            : "—";
                                        const incidentCode =
                                            incident.incidentNumber ||
                                            `INC-${incident.id.slice(0, 8).toUpperCase()}`;
                                        const summary =
                                            incident.message || formatLabel(incident.emergencyType);

                                        return (
                                            <TableRow
                                                key={incident.id}
                                                onClick={() =>
                                                    router.push(
                                                        `/dashboard/emergency/incidents/${incident.id}`
                                                    )
                                                }
                                                className="cursor-pointer"
                                            >
                                                <TableCell
                                                    mono
                                                    bold
                                                    darkText
                                                    className="px-3 whitespace-nowrap"
                                                >
                                                    {incidentCode}
                                                </TableCell>
                                                <TableCell className="px-3 max-w-[165px] xl:max-w-[240px]">
                                                    <div className="flex flex-col min-w-0">
                                                        <span
                                                            className="text-xs font-semibold text-slate-900 truncate"
                                                            title={summary}
                                                        >
                                                            {summary}
                                                        </span>
                                                        <span className="text-[11px] font-mono text-slate-500 truncate">
                                                            {formatLabel(incident.emergencyType)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell
                                                    mono
                                                    darkText
                                                    className="px-3 whitespace-nowrap"
                                                >
                                                    {droneLabel}
                                                </TableCell>
                                                <TableCell className="px-3 whitespace-nowrap">
                                                    <StatusBadge
                                                        status={incident.severity}
                                                        label={incident.severity.toUpperCase()}
                                                    />
                                                </TableCell>
                                                <TableCell mono className="px-3 whitespace-nowrap">
                                                    {incident.responseAction &&
                                                    incident.responseAction !==
                                                        RESPONSE_ACTION.NONE ? (
                                                        <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-slate-100 text-slate-700 border border-slate-200">
                                                            {incident.responseAction}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-3 whitespace-nowrap">
                                                    <StatusBadge status={incident.status} />
                                                </TableCell>
                                                <TableCell
                                                    mono
                                                    muted
                                                    className="px-3 whitespace-nowrap"
                                                >
                                                    {formatDateTime(incident.detectedAt)}
                                                </TableCell>
                                                <TableCell className="px-3 text-right whitespace-nowrap">
                                                    <Link
                                                        href={`/dashboard/emergency/incidents/${incident.id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        aria-label={`Inspect ${incidentCode}`}
                                                        className="inline-flex items-center justify-end text-slate-500 hover:text-slate-900"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>

                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            onPageChange={setPage}
                            pageSize={PAGE_SIZE}
                            itemLabel="incidents"
                        />
                    </>
                )}
            </ChamferCard>
        </div>
    );
}
