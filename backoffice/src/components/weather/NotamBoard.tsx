"use client";

import { useState, useMemo } from "react";
import { FileWarning } from "lucide-react";
import {
    ChamferCard,
    ChamferButton,
    StatusBadge,
    EmptyState,
    SearchInput,
    CustomSelect,
    Pagination,
    Skeleton,
} from "@/components/ui";
import { useWeatherNotams } from "@/hooks";
import { formatDateTime } from "@/utils";

const PAGE_SIZE = 8;

export function NotamBoard() {
    const { data, isLoading } = useWeatherNotams();
    const [search, setSearch] = useState("");
    const [icaoFilter, setIcaoFilter] = useState("all");
    const [severityFilter, setSeverityFilter] = useState("all");
    const [page, setPage] = useState(1);

    const notams = useMemo(() => data?.notams ?? [], [data?.notams]);

    const icaoOptions = useMemo(() => {
        const set = new Set<string>(data?.icaos ?? []);
        for (const n of notams) {
            if (n.icao) set.add(n.icao);
        }
        return [
            { value: "all", label: "All FIR / Aerodromes" },
            ...Array.from(set)
                .sort()
                .map((code) => ({ value: code, label: code })),
        ];
    }, [data?.icaos, notams]);

    const hasFilters = Boolean(search.trim()) || icaoFilter !== "all" || severityFilter !== "all";

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return notams.filter((n) => {
            if (icaoFilter !== "all" && n.icao !== icaoFilter) return false;
            if (severityFilter !== "all" && (n.severity || "").toLowerCase() !== severityFilter) {
                return false;
            }
            if (!q) return true;
            return (
                (n.seriesNumber || "").toLowerCase().includes(q) ||
                (n.icao || "").toLowerCase().includes(q) ||
                (n.subject || "").toLowerCase().includes(q) ||
                (n.text || "").toLowerCase().includes(q)
            );
        });
    }, [notams, search, icaoFilter, severityFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const clearFilters = () => {
        setSearch("");
        setIcaoFilter("all");
        setSeverityFilter("all");
        setPage(1);
    };

    return (
        <ChamferCard size="md">
            <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                        Active NOTAM Board ({filtered.length})
                    </span>
                    {data?.source && (
                        <span className="text-[11px] font-mono text-slate-400">
                            · {data.source}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="w-full sm:w-52">
                        <SearchInput
                            value={search}
                            onChange={(val) => {
                                setSearch(val);
                                setPage(1);
                            }}
                            placeholder="Search NOTAMs..."
                        />
                    </div>
                    <div className="w-full sm:w-44">
                        <CustomSelect
                            ariaLabel="Filter by FIR or aerodrome"
                            value={icaoFilter}
                            onValueChange={(val) => {
                                setIcaoFilter(val);
                                setPage(1);
                            }}
                            options={icaoOptions}
                        />
                    </div>
                    <div className="w-full sm:w-36">
                        <CustomSelect
                            ariaLabel="Filter by severity"
                            value={severityFilter}
                            onValueChange={(val) => {
                                setSeverityFilter(val);
                                setPage(1);
                            }}
                            options={[
                                { value: "all", label: "All Severities" },
                                { value: "critical", label: "Critical" },
                                { value: "warning", label: "Warning" },
                                { value: "info", label: "Advisory" },
                            ]}
                        />
                    </div>
                    {hasFilters && (
                        <ChamferButton variant="outline" size="xs" onClick={clearFilters}>
                            Clear
                        </ChamferButton>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="divide-y divide-slate-200">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx} className="p-4 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-44" />
                                <Skeleton className="h-5 w-16" />
                            </div>
                            <Skeleton className="h-3.5 w-full" />
                            <Skeleton className="h-3.5 w-2/3" />
                        </div>
                    ))}
                </div>
            ) : data?.enabled === false ? (
                <EmptyState
                    icon={FileWarning}
                    title="NOTAM Feed Disabled"
                    description="External NOTAM ingestion is disabled in the weather-ais service configuration."
                />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={FileWarning}
                    title={hasFilters ? "No Matching NOTAMs" : "No Active NOTAMs"}
                    description={
                        hasFilters
                            ? "No Notices to Air Missions match the active search or filter criteria."
                            : "No active Notices to Air Missions reported in monitored FIRs."
                    }
                    action={
                        hasFilters ? (
                            <ChamferButton variant="outline" size="sm" onClick={clearFilters}>
                                Clear Filters
                            </ChamferButton>
                        ) : undefined
                    }
                />
            ) : (
                <>
                    <div className="divide-y divide-slate-200">
                        {pageItems.map((n, idx) => (
                            <div
                                key={n.id ?? n.seriesNumber ?? idx}
                                className="px-4 py-3.5 flex flex-col gap-1.5"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-slate-900">
                                            {n.seriesNumber || n.id || "NOTAM"}
                                        </span>
                                        {n.icao && (
                                            <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-800 text-[10px] font-mono font-bold">
                                                {n.icao}
                                            </span>
                                        )}
                                        {n.qCode && (
                                            <span className="text-[11px] font-mono text-slate-500">
                                                {n.qCode}
                                            </span>
                                        )}
                                        {n.subject && (
                                            <span className="text-xs font-semibold text-slate-800">
                                                {n.subject}
                                            </span>
                                        )}
                                    </div>
                                    <StatusBadge status={n.severity ?? "info"} />
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-slate-500">
                                    <span>
                                        ALT:{" "}
                                        {n.lowerLimitM != null || n.upperLimitM != null
                                            ? `${n.lowerLimitM ?? 0}m – ${n.upperLimitM ?? "UNL"}m`
                                            : "SFC – UNL"}
                                    </span>
                                    {n.radiusNm != null && <span>RADIUS: {n.radiusNm} NM</span>}
                                    {n.validFrom && (
                                        <span>FROM: {formatDateTime(n.validFrom)}</span>
                                    )}
                                    {n.validTo && <span>TO: {formatDateTime(n.validTo)}</span>}
                                </div>

                                {n.text && (
                                    <p className="text-[11px] font-mono text-slate-700 leading-relaxed whitespace-pre-wrap break-words pt-0.5">
                                        {n.text}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="px-4 py-3 border-t border-slate-200">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={filtered.length}
                                pageSize={PAGE_SIZE}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </>
            )}
        </ChamferCard>
    );
}
