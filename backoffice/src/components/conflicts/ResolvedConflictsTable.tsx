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
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const filtered = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const severity = severityFilter.toLowerCase();

        return conflicts.filter((item) => {
            const matchesQuery =
                !query ||
                item.id.toLowerCase().includes(query) ||
                (item.conflictType && item.conflictType.toLowerCase().includes(query)) ||
                (item.description && item.description.toLowerCase().includes(query)) ||
                (item.resolutionStrategy && item.resolutionStrategy.toLowerCase().includes(query));

            const matchesSeverity = severity === "all" || item.severity?.toLowerCase() === severity;

            return matchesQuery && matchesSeverity;
        });
    }, [conflicts, searchQuery, severityFilter]);

    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    const paginatedItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    return (
        <div className="space-y-3">
            <TableFilterBar
                searchQuery={searchQuery}
                onSearchChange={(q) => {
                    setSearchQuery(q);
                    setPage(1);
                }}
                searchPlaceholder="Search resolved conflicts..."
                statusFilter={severityFilter}
                onStatusFilterChange={(s) => {
                    setSeverityFilter(s);
                    setPage(1);
                }}
                statusOptions={SEVERITY_OPTIONS}
                statusPlaceholder="All Severities"
            />

            <ChamferCard size="lg" className="w-full">
                <Table fixed={false}>
                    <TableHeader>
                        <TableRow>
                            <TableHead width="140px">TYPE</TableHead>
                            <TableHead width="110px">SEVERITY</TableHead>
                            <TableHead>DESCRIPTION</TableHead>
                            <TableHead width="140px">STRATEGY</TableHead>
                            <TableHead width="160px">DETECTED</TableHead>
                            <TableHead width="160px">RESOLVED</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableLoading colSpan={6} message="Loading conflict history..." />
                        ) : paginatedItems.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
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
                                        <TableCell className="text-xs text-slate-700 leading-relaxed font-normal">
                                            {item.description || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-block font-mono text-[11px] font-semibold text-slate-700">
                                                {formattedStrategy}
                                            </span>
                                        </TableCell>
                                        <TableCell mono subtle className="text-xs">
                                            {item.detectedAt
                                                ? formatDateTime(item.detectedAt)
                                                : "—"}
                                        </TableCell>
                                        <TableCell mono subtle className="text-xs">
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
            </ChamferCard>

            {filtered.length > pageSize && (
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={filtered.length}
                    onPageChange={setPage}
                />
            )}
        </div>
    );
}
