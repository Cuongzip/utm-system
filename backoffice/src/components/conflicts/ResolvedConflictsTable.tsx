"use client";

import { useState, useMemo } from "react";
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
import { usePagination } from "@/hooks";
import { formatDateTime, createStatusOptions } from "@/utils";
import { CONFLICT_SEVERITIES, DEFAULT_CONFLICT_SEVERITY, type Conflict } from "@/types";

export interface ResolvedConflictsTableProps {
    conflicts: Conflict[];
    isLoading?: boolean;
}

const SEVERITY_OPTIONS = createStatusOptions(CONFLICT_SEVERITIES, undefined, "All Severities");

export function ResolvedConflictsTable({
    conflicts,
    isLoading = false,
}: ResolvedConflictsTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [severityFilter, setSeverityFilter] = useState("all");

    const filtered = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const severity = severityFilter.toLowerCase();

        return conflicts.filter((item) => {
            const matchesQuery =
                !query ||
                [item.id, item.conflictType, item.description, item.resolutionStrategy].some((s) =>
                    s?.toLowerCase().includes(query)
                );
            const matchesSeverity = severity === "all" || item.severity?.toLowerCase() === severity;
            return matchesQuery && matchesSeverity;
        });
    }, [conflicts, searchQuery, severityFilter]);

    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(filtered);

    return (
        <div className="space-y-3">
            <TableFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search resolved conflicts..."
                statusFilter={severityFilter}
                onStatusFilterChange={setSeverityFilter}
                statusOptions={SEVERITY_OPTIONS}
                statusPlaceholder="All Severities"
            />

            <ChamferCard size="lg" className="w-full">
                <Table fixed>
                    <TableHeader>
                        <TableRow>
                            <TableHead width="140px">TYPE</TableHead>
                            <TableHead width="110px">SEVERITY</TableHead>
                            <TableHead>DESCRIPTION</TableHead>
                            <TableHead width="140px">STRATEGY</TableHead>
                            <TableHead width="160px">RESOLVED AT</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableLoading colSpan={5} message="Loading conflict history..." />
                        ) : paginatedItems.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="py-8 text-center text-slate-400 text-xs"
                                >
                                    No resolved conflicts found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((item) => {
                                const formattedType = item.conflictType
                                    ? item.conflictType.replace(/_/g, " ").toUpperCase()
                                    : "CONFLICT";

                                const formattedStrategy = item.resolutionStrategy
                                    ? item.resolutionStrategy.replace(/_/g, " ").toUpperCase()
                                    : "—";

                                const timeTooltip = item.detectedAt
                                    ? `Detected: ${formatDateTime(item.detectedAt)}`
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
                                            tooltip={item.description || undefined}
                                            className="text-xs text-slate-700 font-normal"
                                        >
                                            {item.description || "—"}
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
                />
            </ChamferCard>
        </div>
    );
}
