"use client";

import { useTranslations } from "next-intl";
import { Activity } from "lucide-react";
import {
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
import { formatTime, localizeResponseAction, localizeServerText } from "@/utils";
import { EMERGENCY_TYPES, type BlackboxEntryVm, type EmergencyType } from "@/types";

interface IncidentBlackboxTabProps {
    blackboxEntries: BlackboxEntryVm[];
    blackboxLoading: boolean;
    entityMap: ReadonlyMap<string, string>;
}

export function IncidentBlackboxTab({
    blackboxEntries,
    blackboxLoading,
    entityMap,
}: IncidentBlackboxTabProps) {
    const t = useTranslations("emergency");
    const locale = useAppLocale();

    return (
        <div>
            {!blackboxLoading && blackboxEntries.length === 0 ? (
                <EmptyState
                    icon={Activity}
                    title={t("detail.noBlackboxTitle")}
                    description={t("detail.noBlackboxDesc")}
                />
            ) : (
                <div className="border border-[var(--color-border-default)] rounded-md overflow-hidden max-h-72 overflow-y-auto">
                    <Table fixed={false}>
                        <TableHeader className="sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="px-3 py-2.5">{t("detail.colTime")}</TableHead>
                                <TableHead className="px-3 py-2.5">{t("detail.colAlt")}</TableHead>
                                <TableHead className="px-3 py-2.5">
                                    {t("detail.colSpdMs")}
                                </TableHead>
                                <TableHead className="px-3 py-2.5">{t("detail.colBat")}</TableHead>
                                <TableHead className="px-3 py-2.5">
                                    {t("detail.colEventCmd")}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {blackboxLoading ? (
                                <TableLoading
                                    colSpan={5}
                                    rows={4}
                                    message={t("detail.loadingBlackbox")}
                                />
                            ) : (
                                blackboxEntries.slice(0, 15).map((entry) => {
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
                                    return (
                                        <TableRow key={entry.id}>
                                            <TableCell mono muted className="px-3 py-2 text-xs">
                                                {formatTime(entry.timestamp)}
                                            </TableCell>
                                            <TableCell mono darkText className="px-3 py-2 text-xs">
                                                {entry.altitudeMsl != null
                                                    ? entry.altitudeMsl.toFixed(1)
                                                    : "—"}
                                            </TableCell>
                                            <TableCell mono darkText className="px-3 py-2 text-xs">
                                                {entry.groundSpeed != null
                                                    ? entry.groundSpeed.toFixed(1)
                                                    : "—"}
                                            </TableCell>
                                            <TableCell mono darkText className="px-3 py-2 text-xs">
                                                {entry.batteryLevel != null
                                                    ? `${Math.round(entry.batteryLevel)}%`
                                                    : "—"}
                                            </TableCell>
                                            <TableCell
                                                mono
                                                muted
                                                truncate
                                                tooltip={eventText}
                                                className="px-3 py-2 text-xs"
                                            >
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
        </div>
    );
}
