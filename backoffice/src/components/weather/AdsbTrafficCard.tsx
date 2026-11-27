"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
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
    const t = useTranslations("weather");
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
                        {t("adsb.heading")}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                        {t("adsb.trackedCount", { count: aircraft.length })}
                        {data?.source ? ` · ${data.source}` : ""}
                        {data?.updatedAt ? ` · ${formatDateTime(data.updatedAt)}` : ""}
                    </span>
                </div>
                <div className="w-full sm:w-56">
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder={t("adsb.searchPlaceholder")}
                    />
                </div>
            </div>

            {!isLoading && filtered.length === 0 ? (
                <EmptyState
                    icon={Plane}
                    title={hasSearch ? t("adsb.emptyFilteredTitle") : t("adsb.emptyTitle")}
                    description={hasSearch ? t("adsb.emptyFilteredDesc") : t("adsb.emptyDesc")}
                    action={
                        hasSearch ? (
                            <ChamferButton
                                variant="outline"
                                size="sm"
                                onClick={() => setSearch("")}
                            >
                                {t("adsb.clearSearch")}
                            </ChamferButton>
                        ) : undefined
                    }
                />
            ) : (
                <div className="max-h-[460px] overflow-y-auto">
                    <Table fixed={false}>
                        <TableHeader className="sticky top-0 z-10 bg-slate-50">
                            <TableRow>
                                <TableHead>{t("adsb.colCallsign")}</TableHead>
                                <TableHead>{t("adsb.colTypeReg")}</TableHead>
                                <TableHead>{t("adsb.colPosition")}</TableHead>
                                <TableHead className="text-right">
                                    {t("adsb.colAltitude")}
                                </TableHead>
                                <TableHead className="text-right">
                                    {t("adsb.colSpeedHdg")}
                                </TableHead>
                                <TableHead>{t("adsb.colSquawk")}</TableHead>
                                <TableHead>{t("adsb.colState")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableLoading colSpan={7} rows={4} message={t("adsb.loading")} />
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
                                                label={
                                                    a.onGround
                                                        ? t("adsb.ground")
                                                        : t("adsb.airborne")
                                                }
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
