"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { ChamferCard, ChamferButton, StatusBadge, EmptyState, Skeleton } from "@/components/ui";
import { useActiveAlerts, useEntityCodeMap, QUERY_KEYS } from "@/hooks";
import { alertService } from "@/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib";
import { formatTime, localizeAlertTypeTitle, localizeServerText } from "@/utils";
import type { AppLocale } from "@/i18n";
import { ALERT_SEVERITY, ALERT_STATUS } from "@/types";

export interface ActiveAlertsProps {
    fixedHeight?: boolean;
}

export function ActiveAlerts({ fixedHeight = true }: ActiveAlertsProps) {
    const t = useTranslations("controlCenter");
    const ta = useTranslations("alerts");
    const tc = useTranslations("common");
    const locale = useLocale() as AppLocale;
    const entityMap = useEntityCodeMap();
    const queryClient = useQueryClient();
    const { data: alerts = [], isLoading } = useActiveAlerts();

    const acknowledgeMutation = useMutation({
        mutationFn: (alertId: string) => alertService.acknowledgeAlert(alertId),
        onSuccess: () => {
            toast.success(ta("alertAcknowledged"));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.alertsActive });
        },
        meta: { defaultErrorMessage: ta("failedToAcknowledge") },
    });

    const sortedAlerts = useMemo(() => {
        return [...alerts]
            .filter(
                (a) => a.status !== ALERT_STATUS.RESOLVED && a.status !== ALERT_STATUS.DISMISSED
            )
            .sort((a, b) => {
                const ackA = a.status === ALERT_STATUS.ACKNOWLEDGED ? 1 : 0;
                const ackB = b.status === ALERT_STATUS.ACKNOWLEDGED ? 1 : 0;
                if (ackA !== ackB) return ackA - ackB;
                const timeA = new Date(a.createdOn || 0).getTime();
                const timeB = new Date(b.createdOn || 0).getTime();
                return timeB - timeA;
            });
    }, [alerts]);

    const unacknowledgedCount = useMemo(
        () => sortedAlerts.filter((a) => a.status !== ALERT_STATUS.ACKNOWLEDGED).length,
        [sortedAlerts]
    );
    const totalCount = sortedAlerts.length;

    const headerBadge =
        unacknowledgedCount > 0
            ? { status: "alert" as const, label: t("unackCount", { count: unacknowledgedCount }) }
            : totalCount > 0
              ? { status: ALERT_STATUS.ACKNOWLEDGED, label: t("ackedCount", { count: totalCount }) }
              : { status: "nominal" as const, label: undefined };

    return (
        <ChamferCard
            size={fixedHeight ? "lg" : "md"}
            className={cn("w-full", fixedHeight && "h-[272px]")}
        >
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-3 shrink-0">
                <span className="text-xs font-bold text-[var(--color-text-primary)] font-mono tracking-wider uppercase truncate">
                    {t("activeAlerts")}
                </span>
                <StatusBadge status={headerBadge.status} label={headerBadge.label} />
            </div>

            <div
                className={cn(
                    "overflow-y-auto overscroll-contain divide-y divide-[var(--color-border-subtle)] flex-1 mr-0.5 my-0.5",
                    fixedHeight ? "max-h-[224px]" : "max-h-[300px]"
                )}
            >
                {isLoading ? (
                    <div
                        role="status"
                        aria-busy="true"
                        aria-label={t("loadingAlerts")}
                        className="divide-y divide-[var(--color-border-subtle)]"
                    >
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <div
                                key={idx}
                                className="px-4 py-3 flex items-center justify-between gap-3"
                            >
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <Skeleton className="h-3.5 w-32" />
                                    <Skeleton className="h-3 w-4/5" />
                                </div>
                                <Skeleton className="h-6 w-12" />
                            </div>
                        ))}
                        <span className="sr-only">{t("loadingAlerts")}</span>
                    </div>
                ) : sortedAlerts.length === 0 ? (
                    <EmptyState
                        compact
                        icon={ShieldCheck}
                        title={t("noActiveAlerts")}
                        className="py-8"
                    />
                ) : (
                    sortedAlerts.map((alert) => {
                        const isAcknowledged = alert.status === ALERT_STATUS.ACKNOWLEDGED;
                        const rawTypeKey = (alert.alertType || "ALERT").trim().toUpperCase();
                        const displayType = localizeAlertTypeTitle(rawTypeKey, locale);
                        const cleanMsg =
                            localizeServerText(alert.message, locale, { entityMap }) ||
                            t("anomalyDetected");

                        return (
                            <div
                                key={alert.id}
                                className={cn(
                                    "px-4 py-2.5 flex items-center justify-between gap-3",
                                    isAcknowledged && "opacity-65"
                                )}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <h4 className="text-xs font-bold font-mono text-[var(--color-text-primary)] truncate">
                                            {displayType}
                                        </h4>
                                        <StatusBadge
                                            status={alert.severity || ALERT_SEVERITY.MEDIUM}
                                        />
                                        <span className="text-[11px] text-[var(--color-text-muted)] font-mono tabular-nums shrink-0 ml-auto sm:ml-0">
                                            ·{" "}
                                            {alert.createdOn
                                                ? formatTime(alert.createdOn)
                                                : tc("now")}
                                        </span>
                                    </div>
                                    <p
                                        className="text-[11px] text-[var(--color-text-secondary)] truncate mt-0.5"
                                        title={cleanMsg}
                                    >
                                        {cleanMsg}
                                    </p>
                                </div>

                                <div className="shrink-0">
                                    {isAcknowledged ? (
                                        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
                                            {t("acked")}
                                        </span>
                                    ) : (
                                        <ChamferButton
                                            variant="outline"
                                            size="xs"
                                            clip="xs"
                                            disabled={acknowledgeMutation.isPending}
                                            onClick={() => acknowledgeMutation.mutate(alert.id)}
                                            innerClassName="font-mono text-[11px]"
                                        >
                                            {t("ack")}
                                        </ChamferButton>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </ChamferCard>
    );
}
