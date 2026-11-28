"use client";

import { useTranslations } from "next-intl";
import { Activity } from "lucide-react";
import {
    ChamferCard,
    EmptyState,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableLoading,
} from "@/components/ui";
import { useAppLocale } from "@/i18n";
import { formatTime, formatSpeed, localizeResponseAction, localizeServerText } from "@/utils";
import { EMERGENCY_TYPES, type BlackboxEntryVm, type EmergencyType } from "@/types";

interface IncidentBlackboxFramesTableProps {
    blackboxEntries: BlackboxEntryVm[];
    blackboxLoading: boolean;
    safeIndex: number;
    entityMap: ReadonlyMap<string, string>;
    onSelectFrame: (index: number) => void;
}

export function IncidentBlackboxFramesTable({
    blackboxEntries,
    blackboxLoading,
    safeIndex,
    entityMap,
    onSelectFrame,
}: IncidentBlackboxFramesTableProps) {
    const t = useTranslations("emergency");
    const locale = useAppLocale();
    const frameCount = blackboxEntries.length;

    return (
        <ChamferCard size="lg" className="w-full">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                    {t("detail.blackboxHeading")}
                </span>
                <span className="text-xs font-mono text-slate-400">
                    {frameCount === 1
                        ? t("detail.frameSingle")
                        : t("detail.framePlural", { count: frameCount })}
                </span>
            </div>
            {!blackboxLoading && frameCount === 0 ? (
                <EmptyState
                    compact
                    icon={Activity}
                    title={t("detail.noBlackboxTitle")}
                    description={t("detail.noBlackboxDesc")}
                />
            ) : (
                <div className="max-h-72 overflow-y-auto">
                    <Table fixed={false}>
                        <TableHeader className="sticky top-0 z-10">
                            <TableRow>
                                <TableHead>{t("detail.colFrame")}</TableHead>
                                <TableHead>{t("detail.colTime")}</TableHead>
                                <TableHead>{t("detail.colAlt")}</TableHead>
                                <TableHead>{t("detail.colSpd")}</TableHead>
                                <TableHead>{t("detail.colBat")}</TableHead>
                                <TableHead>{t("detail.colEventCmd")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {blackboxLoading ? (
                                <TableLoading
                                    colSpan={6}
                                    rows={4}
                                    message={t("detail.loadingBlackbox")}
                                />
                            ) : (
                                blackboxEntries.slice(0, 50).map((entry, idx) => {
                                    const eventText = entry.commandExecuted
                                        ? localizeResponseAction(
                                              entry.commandExecuted,
                                              locale,
                                              true
                                          )
                                        : entry.emergencyType &&
                                            (EMERGENCY_TYPES as readonly string[]).includes(
                                                entry.emergencyType
                                            )
                                          ? t(`types.${entry.emergencyType as EmergencyType}`)
                                          : entry.emergencyType
                                            ? localizeServerText(entry.emergencyType, locale, {
                                                  entityMap,
                                              })
                                            : "—";
                                    const isActiveFrame = idx === safeIndex;
                                    return (
                                        <TableRow
                                            key={entry.id}
                                            onClick={() => onSelectFrame(idx)}
                                            className={`cursor-pointer ${
                                                isActiveFrame ? "bg-slate-100" : ""
                                            }`}
                                        >
                                            <TableCell mono bold darkText>
                                                #{idx + 1}
                                            </TableCell>
                                            <TableCell mono muted>
                                                {formatTime(entry.timestamp)}
                                            </TableCell>
                                            <TableCell mono darkText>
                                                {entry.altitudeMsl != null
                                                    ? entry.altitudeMsl.toFixed(1)
                                                    : "—"}
                                            </TableCell>
                                            <TableCell mono darkText>
                                                {formatSpeed(entry.groundSpeed)}
                                            </TableCell>
                                            <TableCell mono darkText>
                                                {entry.batteryLevel != null
                                                    ? `${Math.round(entry.batteryLevel)}%`
                                                    : "—"}
                                            </TableCell>
                                            <TableCell mono muted truncate tooltip={eventText}>
                                                {eventText}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </ChamferCard>
    );
}
