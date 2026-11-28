"use client";

import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import {
    StatusBadge,
    TacticalCallout,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui";
import { translateStatusLabel, type AppLocale } from "@/i18n";
import { formatCoordinates, formatAltitude, formatNullable } from "@/utils";
import { DEFAULT_AIRSPACE_ZONE_TYPE, type CheckPathResult } from "@/types";

interface BriefingCheckResultPanelProps {
    checkResult: CheckPathResult;
}

export function BriefingCheckResultPanel({ checkResult }: BriefingCheckResultPanelProps) {
    const locale = useLocale() as AppLocale;
    const t = useTranslations("airspace");

    const resolveZoneTypeBadge = (zoneType?: string | null) => {
        const effective = zoneType ?? DEFAULT_AIRSPACE_ZONE_TYPE;
        if (translateStatusLabel(effective, locale)) return undefined;
        if (effective === "hub_zone") return t("zoneTypeBadges.hub_zone");
        if (effective === "temporary_restriction") return t("zoneTypeBadges.temporary_restriction");
        return undefined;
    };

    const violations = checkResult.violations || [];
    const isSafe = checkResult.safe === true && violations.length === 0;

    return (
        <div className="pt-2 border-t border-slate-200 flex flex-col gap-3">
            {isSafe ? (
                <TacticalCallout
                    tone="success"
                    icon={CheckCircle2}
                    title={t("briefing.routeClearTitle")}
                    description={t("briefing.routeClearDesc")}
                    rightSlot={<StatusBadge status="go" label={t("briefing.clearBadge")} />}
                />
            ) : (
                <>
                    <TacticalCallout
                        tone="warning"
                        icon={AlertTriangle}
                        title={
                            violations.length === 1
                                ? t("briefing.routeCompromisedSingle")
                                : t("briefing.routeCompromisedPlural", {
                                      count: violations.length,
                                  })
                        }
                        description={t("briefing.routeCompromisedDesc")}
                        rightSlot={
                            <StatusBadge status="no_go" label={t("briefing.conflictBadge")} />
                        }
                    />

                    <div className="max-h-48 overflow-y-auto utm-scroll border border-slate-200 rounded-md">
                        <Table fixed={false}>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("briefing.colZoneName")}</TableHead>
                                    <TableHead>{t("briefing.colType")}</TableHead>
                                    <TableHead>{t("briefing.colConflictCoord")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {violations.map((v, i) => (
                                    <TableRow key={`${v.zoneId || "violation"}-${i}`}>
                                        <TableCell bold darkText>
                                            {formatNullable(
                                                v.name ?? v.zoneId,
                                                undefined,
                                                t("briefing.unnamedZone")
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={v.zoneType ?? DEFAULT_AIRSPACE_ZONE_TYPE}
                                                label={resolveZoneTypeBadge(v.zoneType)}
                                            />
                                        </TableCell>
                                        <TableCell mono>
                                            {formatNullable(
                                                v.conflictPoint,
                                                (pt) =>
                                                    `${formatCoordinates({ latitude: pt.lat, longitude: pt.lon }, 4)} (${formatAltitude(pt.alt !== undefined ? Math.round(pt.alt * 10) / 10 : undefined)})`
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}
        </div>
    );
}
