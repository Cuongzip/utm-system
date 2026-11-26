"use client";

import { useState, useMemo } from "react";
import { Plane } from "lucide-react";
import {
    ChamferCard,
    ChamferButton,
    StatusBadge,
    EmptyState,
    SearchInput,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableLoading,
} from "@/components/ui";
import { useAdsbAircraft } from "@/hooks";
import { formatCoordinates, formatDateTime } from "@/utils";

export function AdsbTrafficCard() {
    const { data, isLoading } = useAdsbAircraft(true, 15000);
    const [search, setSearch] = useState("");

    const aircraft = useMemo(() => data?.aircraft ?? [], [data?.aircraft]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return aircraft;
        return aircraft.filter(
            (a) =>
                (a.callsign || "").toLowerCase().includes(q) ||
                (a.hex || "").toLowerCase().includes(q) ||
                (a.registration || "").toLowerCase().includes(q) ||
                (a.aircraftType || "").toLowerCase().includes(q)
        );
    }, [aircraft, search]);

    const hasSearch = Boolean(search.trim());

    return (
        <ChamferCard size="md">
            <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                        Live Manned Traffic (ADS-B)
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                        {aircraft.length} tracked
                        {data?.source ? ` · ${data.source}` : ""}
                        {data?.updatedAt ? ` · ${formatDateTime(data.updatedAt)}` : ""}
                    </span>
                </div>
                <div className="w-full sm:w-56">
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Search callsign, ICAO hex..."
                    />
                </div>
            </div>

            {!isLoading && filtered.length === 0 ? (
                <EmptyState
                    icon={Plane}
                    title={hasSearch ? "No Matching Aircraft" : "No Manned Aircraft Tracked"}
                    description={
                        hasSearch
                            ? "No ADS-B targets match the search query."
                            : "No live ADS-B targets within the monitored regional surveillance radius."
                    }
                    action={
                        hasSearch ? (
                            <ChamferButton
                                variant="outline"
                                size="sm"
                                onClick={() => setSearch("")}
                            >
                                Clear Search
                            </ChamferButton>
                        ) : undefined
                    }
                />
            ) : (
                <div className="max-h-[460px] overflow-y-auto">
                    <Table fixed={false}>
                        <TableHeader className="sticky top-0 z-10 bg-slate-50">
                            <TableRow>
                                <TableHead>Callsign / Hex</TableHead>
                                <TableHead>Type / Reg</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead className="text-right">Altitude</TableHead>
                                <TableHead className="text-right">Speed / HDG</TableHead>
                                <TableHead>Squawk</TableHead>
                                <TableHead>State</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableLoading
                                    colSpan={7}
                                    rows={4}
                                    message="Loading ADS-B traffic..."
                                />
                            ) : (
                                filtered.map((a, idx) => (
                                    <TableRow key={a.hex ?? a.callsign ?? idx}>
                                        <TableCell mono bold darkText>
                                            <div>{a.callsign || a.hex || "—"}</div>
                                            {a.hex && (
                                                <div className="text-[10px] text-slate-400 font-normal">
                                                    {a.hex}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell mono>
                                            {[a.aircraftType, a.registration]
                                                .filter(Boolean)
                                                .join(" · ") || "—"}
                                        </TableCell>
                                        <TableCell mono>
                                            {formatCoordinates({
                                                latitude: a.latitude,
                                                longitude: a.longitude,
                                            })}
                                        </TableCell>
                                        <TableCell mono className="text-right tabular-nums">
                                            {a.altitudeFt != null
                                                ? `${Math.round(a.altitudeFt).toLocaleString()} ft`
                                                : a.altitudeM != null
                                                  ? `${Math.round(a.altitudeM)} m`
                                                  : "—"}
                                        </TableCell>
                                        <TableCell mono className="text-right tabular-nums">
                                            {a.groundSpeedKt != null
                                                ? `${Math.round(a.groundSpeedKt)} kt`
                                                : "—"}
                                            {a.headingDeg != null
                                                ? ` · ${Math.round(a.headingDeg)}°`
                                                : ""}
                                        </TableCell>
                                        <TableCell mono>{a.squawk || "—"}</TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={a.onGround ? "idle" : "airborne"}
                                                label={a.onGround ? "GROUND" : "AIRBORNE"}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </ChamferCard>
    );
}
