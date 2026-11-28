"use client";

import { useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableLoading,
    TableFilterBar,
    ChamferCard,
    StatusBadge,
    Pagination,
} from "@/components/ui";
import { useEntityCodeMap, usePagination } from "@/hooks";
import type { AppLocale } from "@/i18n";
import {
    formatDateTime,
    createStatusOptions,
    compareCreatedDesc,
    localizeServerText,
} from "@/utils";
import { CONFLICT_SEVERITIES, DEFAULT_CONFLICT_SEVERITY, type Conflict } from "@/types";

interface ResolvedConflictsTableProps {
    conflicts: Conflict[];
    isLoading: boolean;
}

export function ResolvedConflictsTable({
    conflicts,
    isLoading = false,
}: ResolvedConflictsTableProps) {
    const locale = useLocale() as AppLocale;
    const t = useTranslations("conflicts");
    const entityMap = useEntityCodeMap();
    const [searchQuery, setSearchQuery] = useState("");
    const [severityFilter, setSeverityFilter] = useState("all");

    const severityOptions = useMemo(
        () => createStatusOptions(CONFLICT_SEVERITIES, undefined, t("history.allSeverities")),
        [t]
    );

    const filtered = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const severity = severityFilter.toLowerCase();

        return [...conflicts]
            .filter((item) => {
                const matchesQuery =
                    !query ||
                    [item.id, item.conflictType, item.description, item.resolutionStrategy].some(
                        (s) => s?.toLowerCase().includes(query)
                    );
                const matchesSeverity =
                    severity === "all" || item.severity?.toLowerCase() === severity;
                return matchesQuery && matchesSeverity;
            })
            .sort(compareCreatedDesc);
    }, [conflicts, searchQuery, severityFilter]);

    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(filtered);

    return (
        <div className="space-y-3">
            <TableFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={t("history.searchPlaceholder")}
                statusFilter={severityFilter}
                onStatusFilterChange={setSeverityFilter}
                statusOptions={severityOptions}
                statusPlaceholder={t("history.allSeverities")}
            />

            <ChamferCard size="lg" className="w-full">
                <Table fixed={false}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("history.colType")}</TableHead>
                            <TableHead>{t("history.colSeverity")}</TableHead>
                            <TableHead>{t("history.colDescription")}</TableHead>
                            <TableHead>{t("history.colStrategy")}</TableHead>
                            <TableHead>{t("history.colResolvedAt")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableLoading colSpan={5} message={t("history.loading")} />
                        ) : paginatedItems.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="py-8 text-center text-slate-400 text-xs"
                                >
                                    {t("history.empty")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((item) => {
                                const formattedType =
                                    item.conflictType && t.has(`types.${item.conflictType}`)
                                        ? t(`types.${item.conflictType}`)
                                        : item.conflictType
                                          ? item.conflictType.replace(/_/g, " ").toUpperCase()
                                          : t("fallbackShortType");

                                const formattedStrategy = item.resolutionStrategy
                                    ? t.has(`strategies.${item.resolutionStrategy}`)
                                        ? t(`strategies.${item.resolutionStrategy}`)
                                        : item.resolutionStrategy.replace(/_/g, " ").toUpperCase()
                                    : "—";

                                const localizedDesc = item.description
                                    ? localizeServerText(item.description, locale, { entityMap })
                                    : "";

                                const timeTooltip = item.detectedAt
                                    ? t("history.detectedTooltip", {
                                          time: formatDateTime(item.detectedAt),
                                      })
                                    : undefined;

                                return (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <span className="inline-block border border-slate-200 bg-slate-50 text-slate-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                                {formattedType}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={item.severity ?? DEFAULT_CONFLICT_SEVERITY}
                                            />
                                        </TableCell>
                                        <TableCell
                                            truncate
                                            tooltip={localizedDesc || undefined}
                                            className="max-w-[340px] text-xs text-slate-700 font-normal"
                                        >
                                            {localizedDesc || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-block font-mono text-[11px] font-semibold text-slate-700">
                                                {formattedStrategy}
                                            </span>
                                        </TableCell>
                                        <TableCell
                                            mono
                                            subtle
                                            className="text-xs"
                                            tooltip={timeTooltip}
                                        >
                                            {item.resolvedAt
                                                ? formatDateTime(item.resolvedAt)
                                                : "—"}
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
                    itemLabel={t("history.itemLabel")}
                />
            </ChamferCard>
        </div>
    );
}
