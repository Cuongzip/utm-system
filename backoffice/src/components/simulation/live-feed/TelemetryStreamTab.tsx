"use client";

import { useTranslations } from "next-intl";
import { Satellite } from "lucide-react";
import {
    StatusBadge,
    EmptyState,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui";
import { formatTime, formatCoordinates, formatAltitude } from "@/utils";
import type { TelemetryRecord } from "@/types";

interface TelemetryStreamTabProps {
    records: TelemetryRecord[];
}

export function TelemetryStreamTab({ records }: TelemetryStreamTabProps) {
    const t = useTranslations("simulation.liveFeed");

    return (
        <div className="p-0">
            {records.length === 0 ? (
                <EmptyState
                    compact
                    icon={Satellite}
                    title={t("emptyTelemetryTitle")}
                    description={t("emptyTelemetryDesc")}
                />
            ) : (
                <Table fixed={false} wrapperClassName="max-h-[420px] overflow-y-auto">
                    <TableHeader className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                        <TableRow>
                            <TableHead>{t("colTime")}</TableHead>
                            <TableHead>{t("colCoords")}</TableHead>
                            <TableHead>{t("colAltitude")}</TableHead>
                            <TableHead>{t("colSpeed")}</TableHead>
                            <TableHead>{t("colHeading")}</TableHead>
                            <TableHead>{t("colBattery")}</TableHead>
                            <TableHead align="right">{t("colStream")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 font-mono text-xs">
                        {records.map((rec, index) => {
                            const coords = formatCoordinates(rec, 6);
                            const alt = formatAltitude(rec.altitude);
                            const spd = rec.speed != null ? `${rec.speed.toFixed(1)} m/s` : "—";
                            const hdg = rec.heading != null ? `${rec.heading.toFixed(0)}°` : "—";
                            const bat =
                                rec.batteryPercentage != null
                                    ? `${rec.batteryPercentage.toFixed(1)}%`
                                    : "—";
                            const isFirst = index === 0;

                            return (
                                <TableRow
                                    key={rec.id || index}
                                    className={`transition-colors hover:bg-slate-50 ${isFirst ? "bg-slate-50/80" : ""}`}
                                >
                                    <TableCell mono muted>
                                        {formatTime(rec.timestamp ?? new Date().toISOString())}
                                    </TableCell>
                                    <TableCell mono darkText>
                                        {coords}
                                    </TableCell>
                                    <TableCell mono darkText>
                                        {alt}
                                    </TableCell>
                                    <TableCell mono darkText>
                                        {spd}
                                    </TableCell>
                                    <TableCell mono darkText>
                                        {hdg}
                                    </TableCell>
                                    <TableCell mono bold>
                                        <span
                                            className={
                                                (rec.batteryPercentage ?? 100) < 20
                                                    ? "text-red-600"
                                                    : (rec.batteryPercentage ?? 100) < 50
                                                      ? "text-amber-600"
                                                      : "text-emerald-600"
                                            }
                                        >
                                            {bat}
                                        </span>
                                    </TableCell>
                                    <TableCell align="right">
                                        {isFirst ? (
                                            <StatusBadge status="live" dotShape="circle" />
                                        ) : (
                                            <span className="text-[10px] font-mono text-slate-400">
                                                {t("sampleTag")}
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
