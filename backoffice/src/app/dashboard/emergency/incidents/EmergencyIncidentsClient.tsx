"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RefreshCw, ShieldCheck, ChevronRight, X } from "lucide-react";
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
import { useEmergencyIncidents, useDronesAll, useEntityCodeMap, useFlightsAll } from "@/hooks";
import { translateStatusLabel, useAppLocale } from "@/i18n";
import { formatDateTime, localizeResponseAction, localizeServerText } from "@/utils";
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

export function EmergencyIncidentsClient() {
    const router = useRouter();
    const t = useTranslations("emergency");
    const tCommon = useTranslations("common");
    const locale = useAppLocale();
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
    const entityMap = useEntityCodeMap();

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

    const getTypeLabel = useMemo(
        () => (rawType?: string) => {
            if (!rawType) return "";
            if ((EMERGENCY_TYPES as readonly string[]).includes(rawType)) {
                return t(`types.${rawType as EmergencyType}`);
            }
            return formatLabel(rawType);
        },
        [t]
    );

    const statusOptions = useMemo(
        () => [
            { value: ALL_VALUE, label: tCommon("allStatuses") },
            ...INCIDENT_STATUSES.map((s) => ({
                value: s,
                label: translateStatusLabel(s, locale) ?? formatLabel(s),
            })),
        ],
        [tCommon, locale]
    );

    const severityOptions = useMemo(
        () => [
            { value: ALL_VALUE, label: t("incidentsPage.allSeverities") },
            ...EMERGENCY_SEVERITIES.map((s) => ({
                value: s,
                label: translateStatusLabel(s, locale) ?? formatLabel(s),
            })),
        ],
        [t, locale]
    );

    const typeOptions = useMemo(
        () => [
            { value: ALL_VALUE, label: t("incidentsPage.allTypes") },
            ...EMERGENCY_TYPES.map((tp) => ({ value: tp, label: t(`types.${tp}`) })),
        ],
        [t]
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
            <PageHeader title={t("title")}>
                <ChamferButton
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isFetching}
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                    <span>{tCommon("refresh")}</span>
                </ChamferButton>
            </PageHeader>

            <EmergencyNavTabs />

            <div className="flex flex-wrap items-center gap-2.5 w-full">
                <div className="w-full sm:w-44">
                    <CustomSelect
                        id="filter-incident-status"
                        ariaLabel={t("incidentsPage.filterStatusAria")}
                        value={statusFilter}
                        onValueChange={(v) => {
                            setStatusFilter(v);
                            setPage(1);
                        }}
                        options={statusOptions}
                        placeholder={tCommon("status")}
                        className="h-[34px] text-xs font-medium border-[var(--color-border-strong)] bg-[var(--color-surface-panel)] rounded-md"
                    />
                </div>

                <div className="w-full sm:w-40">
                    <CustomSelect
                        id="filter-incident-severity"
                        ariaLabel={t("incidentsPage.filterSeverityAria")}
                        value={severityFilter}
                        onValueChange={(v) => {
                            setSeverityFilter(v);
                            setPage(1);
                        }}
                        options={severityOptions}
                        placeholder={t("incidentsPage.severityPlaceholder")}
                        className="h-[34px] text-xs font-medium border-[var(--color-border-strong)] bg-[var(--color-surface-panel)] rounded-md"
                    />
                </div>

                <div className="w-full sm:w-52">
                    <CustomSelect
                        id="filter-incident-type"
                        ariaLabel={t("incidentsPage.filterTypeAria")}
                        value={typeFilter}
                        onValueChange={(v) => {
                            setTypeFilter(v);
                            setPage(1);
                        }}
                        options={typeOptions}
                        placeholder={t("incidentsPage.typePlaceholder")}
                        className="h-[34px] text-xs font-medium border-[var(--color-border-strong)] bg-[var(--color-surface-panel)] rounded-md"
                    />
                </div>

                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="inline-flex items-center gap-1 h-[34px] px-2.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-[var(--color-surface-panel)] border border-[var(--color-border-strong)] rounded-md hover:bg-[var(--color-surface-subtle)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{tCommon("clear")}</span>
                    </button>
                )}

                <div className="sm:ml-auto text-xs font-mono text-slate-500 tabular-nums">
                    {totalItems === 1
                        ? t("incidentsPage.countSingle")
                        : t("incidentsPage.countPlural", { count: totalItems })}
                </div>
            </div>

            <ChamferCard size="lg" className="w-full">
                {isError && incidents.length === 0 ? (
                    <ErrorState
                        wrapped={false}
                        title={t("incidentsPage.loadErrorTitle")}
                        description={t("incidentsPage.loadErrorDesc")}
                        onRetry={() => refetch()}
                        retrying={isFetching}
                    />
                ) : !isLoading && incidents.length === 0 ? (
                    <EmptyState
                        icon={ShieldCheck}
                        title={
                            hasActiveFilters
                                ? t("incidentsPage.emptyFilteredTitle")
                                : t("incidentsPage.emptyTitle")
                        }
                        description={
                            hasActiveFilters
                                ? t("incidentsPage.emptyFilteredDesc")
                                : t("incidentsPage.emptyDesc")
                        }
                        action={
                            hasActiveFilters ? (
                                <ChamferButton
                                    variant="outline"
                                    size="sm"
                                    onClick={handleResetFilters}
                                >
                                    {t("incidentsPage.clearFilters")}
                                </ChamferButton>
                            ) : undefined
                        }
                    />
                ) : (
                    <>
                        <Table fixed={false}>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="px-3">
                                        {t("incidentsPage.colIncident")}
                                    </TableHead>
                                    <TableHead className="px-3">
                                        {t("incidentsPage.colTypeSummary")}
                                    </TableHead>
                                    <TableHead className="px-3">
                                        {t("incidentsPage.colAircraft")}
                                    </TableHead>
                                    <TableHead className="px-3">
                                        {t("incidentsPage.colSeverity")}
                                    </TableHead>
                                    <TableHead className="px-3">
                                        {t("incidentsPage.colAction")}
                                    </TableHead>
                                    <TableHead className="px-3">
                                        {t("incidentsPage.colStatus")}
                                    </TableHead>
                                    <TableHead className="px-3">
                                        {t("incidentsPage.colDetected")}
                                    </TableHead>
                                    <TableHead className="px-3" align="right">
                                        {tCommon("actions")}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableLoading
                                        colSpan={8}
                                        message={t("incidentsPage.loading")}
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
                                        const typeLabel = getTypeLabel(incident.emergencyType);
                                        const summary = incident.message
                                            ? localizeServerText(incident.message, locale, {
                                                  entityMap,
                                              })
                                            : typeLabel;

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
                                                            {typeLabel}
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
                                                    <StatusBadge status={incident.severity} />
                                                </TableCell>
                                                <TableCell mono className="px-3 whitespace-nowrap">
                                                    {incident.responseAction &&
                                                    incident.responseAction !==
                                                        RESPONSE_ACTION.NONE ? (
                                                        <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-slate-100 text-slate-700 border border-slate-200">
                                                            {localizeResponseAction(
                                                                incident.responseAction,
                                                                locale,
                                                                true
                                                            )}
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
                                                        aria-label={t("incidentsPage.inspectAria", {
                                                            code: incidentCode,
                                                        })}
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
                            itemLabel={t("incidentsPage.itemLabel")}
                        />
                    </>
                )}
            </ChamferCard>
        </div>
    );
}
