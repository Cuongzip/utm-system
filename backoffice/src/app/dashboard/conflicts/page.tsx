"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, Radio, Layers, ShieldAlert, RotateCcw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
    PageHeader,
    ChamferCard,
    StatusBadge,
    ChamferButton,
    ConfirmDialog,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableFilterBar,
} from "@/components/ui";
import { TacticalMapContainer } from "@/components/map";
import { cn } from "@/lib";

interface ActiveConflictItem {
    id: string;
    title: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    description: string;
    detectedAt: string;
    separation?: string;
    status: "DETECTED" | "RESOLVING";
    typeBadge: string;
}

interface ResolvedConflictItem {
    id: string;
    type: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    description: string;
    status: "RESOLVED";
    detectedAt: string;
    resolvedAt: string;
}

const INITIAL_ACTIVE_CONFLICTS: ActiveConflictItem[] = [
    {
        id: "ACT-001",
        title: "SEPARATION MINIMUM BREACH",
        severity: "HIGH",
        description:
            "Minimum separation breach detected between DRP-2026-0001 and DRP-2026-0003 near Da Nang Logistics Hub. Projected convergence at 250m altitude.",
        detectedAt: "Nov 06, 2026, 11:16 AM",
        separation: "180m",
        status: "DETECTED",
        typeBadge: "SEPARATION",
    },
    {
        id: "ACT-002",
        title: "AIRSPACE RESTRICTION VIOLATION",
        severity: "MEDIUM",
        description:
            "Flight DRP-2026-0002 trajectory enters Da Nang International Airport Zone boundary. Tactical rerouting recommended.",
        detectedAt: "Nov 06, 2026, 11:20 AM",
        status: "RESOLVING",
        typeBadge: "AIRSPACE",
    },
];

const INITIAL_RESOLVED_CONFLICTS: ResolvedConflictItem[] = [
    {
        id: "RES-001",
        type: "WEATHER",
        severity: "LOW",
        description:
            "Wind speed exceeded operational limit for delivery flight DRP-2026-0008 near Son Tra tactical corridor. Flight safely recalled to Hub 1.",
        status: "RESOLVED",
        detectedAt: "Nov 06, 2026, 09:15 AM",
        resolvedAt: "Nov 06, 2026, 09:22 AM",
    },
    {
        id: "RES-002",
        type: "AIRSPACE",
        severity: "MEDIUM",
        description:
            "Unauthorized proximity to Da Nang Port temporary restricted zone by DRP-2026-0012. Rerouted to outer tactical corridor.",
        status: "RESOLVED",
        detectedAt: "Nov 05, 2026, 03:22 PM",
        resolvedAt: "Nov 05, 2026, 03:28 PM",
    },
];

const SEVERITY_OPTIONS = [
    { value: "all", label: "All Severities" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
];

export default function ConflictsPage() {
    const [activeConflicts, setActiveConflicts] =
        useState<ActiveConflictItem[]>(INITIAL_ACTIVE_CONFLICTS);
    const [resolvedConflicts, setResolvedConflicts] = useState<ResolvedConflictItem[]>(
        INITIAL_RESOLVED_CONFLICTS
    );

    const [showLiveTraffic, setShowLiveTraffic] = useState(true);
    const [showAirspace, setShowAirspace] = useState(true);
    const [showDroneZones, setShowDroneZones] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [severityFilter, setSeverityFilter] = useState("all");

    const [resolvingConflict, setResolvingConflict] = useState<ActiveConflictItem | null>(null);

    const handleToggleLayer = (name: string, current: boolean, setter: (val: boolean) => void) => {
        setter(!current);
        toast.info(`${name} layer ${!current ? "enabled" : "disabled"}`);
    };

    const handleConfirmResolve = () => {
        if (!resolvingConflict) return;

        setActiveConflicts((prev) => prev.filter((c) => c.id !== resolvingConflict.id));
        setResolvedConflicts((prev) => [
            {
                id: `RES-${Date.now()}`,
                type: resolvingConflict.typeBadge,
                severity: resolvingConflict.severity,
                description: resolvingConflict.description,
                status: "RESOLVED",
                detectedAt: resolvingConflict.detectedAt,
                resolvedAt: "Just now",
            },
            ...prev,
        ]);

        toast.success(`Conflict "${resolvingConflict.title}" marked as resolved`);
        setResolvingConflict(null);
    };

    const handleResetDemo = () => {
        setActiveConflicts(INITIAL_ACTIVE_CONFLICTS);
        setResolvedConflicts(INITIAL_RESOLVED_CONFLICTS);
        toast.info("Mock conflicts reset to default state");
    };

    const filteredResolved = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const severity = severityFilter.toLowerCase();

        return resolvedConflicts.filter((item) => {
            const matchesQuery =
                !query ||
                item.id.toLowerCase().includes(query) ||
                item.type.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query);

            const matchesSeverity = severity === "all" || item.severity.toLowerCase() === severity;

            return matchesQuery && matchesSeverity;
        });
    }, [resolvedConflicts, searchQuery, severityFilter]);

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader title="AIRSPACE CONFLICTS">
                {activeConflicts.length < INITIAL_ACTIVE_CONFLICTS.length && (
                    <ChamferButton variant="outline" size="sm" clip="xs" onClick={handleResetDemo}>
                        <RotateCcw className="w-3.5 h-3.5 text-[#334155]" />
                        <span>Reset Demo</span>
                    </ChamferButton>
                )}
            </PageHeader>

            {/* Tactical Map Container */}
            <TacticalMapContainer
                initialMode="2d"
                initialLayerType="satellite"
                className="w-full h-[480px]"
                header={
                    <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
                                TACTICAL CONFLICT RADAR & AIRSPACE
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    handleToggleLayer(
                                        "Live Traffic",
                                        showLiveTraffic,
                                        setShowLiveTraffic
                                    )
                                }
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer rounded ${
                                    showLiveTraffic
                                        ? "bg-slate-800 text-white shadow-xs"
                                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                <Radio className="w-3.5 h-3.5" />
                                <span>LIVE TRAFFIC</span>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    handleToggleLayer("Airspace", showAirspace, setShowAirspace)
                                }
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer rounded ${
                                    showAirspace
                                        ? "bg-slate-800 text-white shadow-xs"
                                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                <span>AIRSPACE</span>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    handleToggleLayer(
                                        "Drone Zones",
                                        showDroneZones,
                                        setShowDroneZones
                                    )
                                }
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer rounded ${
                                    showDroneZones
                                        ? "bg-slate-800 text-white shadow-xs"
                                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>DRONE ZONES</span>
                            </button>
                        </div>
                    </div>
                }
                overlay={
                    <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-700/80 text-[11px] font-mono text-slate-300 pointer-events-none">
                        <span>LAT 16°04&apos;N</span>
                        <span className="text-slate-600">|</span>
                        <span>LON 108°13&apos;E</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-cyan-400 font-medium">
                            ● DA NANG AIRSPACE SECTOR 1 • LIVE MONITORED
                        </span>
                    </div>
                }
            />

            {/* Active Conflicts Section */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-red-500 font-bold text-sm tracking-wide">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Active Conflicts ({activeConflicts.length})</span>
                </div>

                {activeConflicts.length === 0 ? (
                    <ChamferCard size="md" className="p-8 text-center bg-white/70">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            <span className="text-sm font-semibold text-slate-800">
                                Airspace Clean & Clear
                            </span>
                            <p className="text-xs text-slate-500 max-w-md">
                                No active separation breaches or airspace boundary violations
                                detected.
                            </p>
                        </div>
                    </ChamferCard>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeConflicts.map((conflict) => {
                            const isHigh = conflict.severity === "HIGH";

                            return (
                                <ChamferCard
                                    key={conflict.id}
                                    size="md"
                                    className="relative border border-amber-300/40"
                                >
                                    <div className="p-5 flex flex-col justify-between h-full space-y-3.5">
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
                                                {conflict.title}
                                            </h3>
                                            <StatusBadge
                                                status={isHigh ? "high" : "medium"}
                                                label={conflict.severity}
                                                className={cn(
                                                    "px-2.5 py-0.5 rounded-[3px] text-[10px] border",
                                                    isHigh
                                                        ? "border-amber-300/80 bg-amber-50/70 text-amber-600"
                                                        : "border-amber-300/80 bg-amber-50/70 text-amber-600"
                                                )}
                                            />
                                        </div>

                                        <p className="text-xs text-slate-600 leading-relaxed font-sans">
                                            {conflict.description}
                                        </p>

                                        <div className="text-[11px] text-slate-400 font-mono">
                                            Detected: {conflict.detectedAt}
                                            {conflict.separation &&
                                                ` | Separation: ${conflict.separation}`}
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <StatusBadge
                                                status={
                                                    conflict.status === "DETECTED"
                                                        ? "alert"
                                                        : "warning"
                                                }
                                                label={conflict.status}
                                                className={cn(
                                                    "px-2.5 py-0.5 rounded-[3px] text-[10px] border",
                                                    conflict.status === "DETECTED"
                                                        ? "border-red-200/80 bg-red-50/70 text-red-600"
                                                        : "border-amber-200/80 bg-amber-50/70 text-amber-600"
                                                )}
                                            />

                                            <ChamferButton
                                                size="sm"
                                                variant="dark"
                                                onClick={() => setResolvingConflict(conflict)}
                                            >
                                                Resolve
                                            </ChamferButton>
                                        </div>
                                    </div>
                                </ChamferCard>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Resolved Conflicts Section */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                        Resolved Conflicts
                    </h2>
                </div>

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
                    <Table fixed={false}>
                        <TableHeader>
                            <TableRow>
                                <TableHead width="120px">TYPE</TableHead>
                                <TableHead width="120px">SEVERITY</TableHead>
                                <TableHead>DESCRIPTION</TableHead>
                                <TableHead width="140px">STATUS</TableHead>
                                <TableHead width="190px">DETECTED</TableHead>
                                <TableHead width="190px">RESOLVED</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredResolved.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="py-8 text-center text-slate-400 text-xs"
                                    >
                                        No resolved conflicts found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredResolved.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <span className="inline-block border border-slate-200 bg-slate-50 text-slate-600 font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                                {item.type}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={item.severity.toLowerCase()}
                                                label={item.severity}
                                                className={cn(
                                                    "border px-2 py-0.5 rounded-[3px] text-[10px]",
                                                    item.severity === "LOW"
                                                        ? "border-blue-200/80 bg-blue-50/70 text-blue-600"
                                                        : item.severity === "MEDIUM"
                                                          ? "border-amber-200/80 bg-amber-50/70 text-amber-600"
                                                          : "border-red-200/80 bg-red-50/70 text-red-600"
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-700 leading-relaxed font-normal">
                                            {item.description}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status="resolved"
                                                label="RESOLVED"
                                                className="border border-emerald-200/80 bg-emerald-50/70 text-emerald-700 px-2 py-0.5 rounded-[3px] text-[10px]"
                                            />
                                        </TableCell>
                                        <TableCell mono subtle className="text-xs">
                                            {item.detectedAt}
                                        </TableCell>
                                        <TableCell mono subtle className="text-xs">
                                            {item.resolvedAt}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </ChamferCard>
            </div>

            {/* Resolve Confirmation Dialog */}
            <ConfirmDialog
                isOpen={Boolean(resolvingConflict)}
                onClose={() => setResolvingConflict(null)}
                onConfirm={handleConfirmResolve}
                variant="default"
                title="Resolve Airspace Conflict"
                description={
                    resolvingConflict ? (
                        <div className="space-y-2 text-xs">
                            <p>
                                Are you sure you want to resolve the{" "}
                                <strong className="text-slate-900">
                                    {resolvingConflict.title}
                                </strong>{" "}
                                conflict?
                            </p>
                            <p className="text-slate-500 font-mono text-[11px] bg-slate-50 p-2 rounded border border-slate-200">
                                {resolvingConflict.description}
                            </p>
                            <p className="text-slate-600">
                                This will mark the conflict as resolved, archive the tactical alert,
                                and log the operational event.
                            </p>
                        </div>
                    ) : null
                }
                confirmText="Confirm Resolution"
                cancelText="Cancel"
            />
        </div>
    );
}
