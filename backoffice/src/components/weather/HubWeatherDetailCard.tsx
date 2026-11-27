"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, CloudSun } from "lucide-react";
import {
    ChamferCard,
    StatusBadge,
    EmptyState,
    Skeleton,
    TacticalCallout,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableLoading,
} from "@/components/ui";
import { useHubCurrentWeather, useHubWeatherForecast, useHubWeatherAlerts } from "@/hooks";
import type { AppLocale } from "@/i18n";
import { formatDateTime, localizeServerText } from "@/utils";
import type { Hub } from "@/types";

interface HubWeatherDetailCardProps {
    hub?: Hub;
}

export function HubWeatherDetailCard({ hub }: HubWeatherDetailCardProps) {
    const locale = useLocale() as AppLocale;
    const t = useTranslations("weather");
    const hubId = hub?.id ?? "";
    const { data: current, isLoading: currentLoading } = useHubCurrentWeather(
        hubId,
        Boolean(hubId)
    );
    const { data: forecast, isLoading: forecastLoading } = useHubWeatherForecast(
        hubId,
        Boolean(hubId)
    );
    const { data: alerts = [] } = useHubWeatherAlerts(hubId, Boolean(hubId));

    const actionableAlerts = useMemo(
        () => alerts.filter((a) => (a.type || "").toUpperCase() !== "FLIGHT_CATEGORY"),
        [alerts]
    );

    if (!hub) {
        return (
            <ChamferCard size="md">
                <EmptyState
                    icon={CloudSun}
                    title={t("hubDetail.selectTitle")}
                    description={t("hubDetail.selectDesc")}
                />
            </ChamferCard>
        );
    }

    const hourlyRows = (forecast?.hourly ?? []).slice(0, 24);
    const subtitleParts = [
        current?.conditionSummary,
        current?.observedAt
            ? t("hubDetail.observedAt", { time: formatDateTime(current.observedAt) })
            : undefined,
    ].filter(Boolean);

    return (
        <div className="flex flex-col gap-4">
            <ChamferCard size="md">
                <div className="p-4 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-slate-900">{hub.name}</h2>
                                <span className="text-xs font-mono text-slate-500">
                                    ({hub.code})
                                </span>
                            </div>
                            {currentLoading ? (
                                <Skeleton className="h-3.5 w-44 mt-1" />
                            ) : subtitleParts.length > 0 ? (
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {subtitleParts.join(" · ")}
                                </p>
                            ) : null}
                        </div>
                        <div className="flex items-center gap-2.5">
                            {current?.flightCategory && (
                                <StatusBadge status={current.flightCategory} />
                            )}
                            {current?.flightConditions && (
                                <StatusBadge status={current.flightConditions} />
                            )}
                        </div>
                    </div>

                    {currentLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-px bg-[var(--color-border-default)] border border-[var(--color-border-default)] rounded-md overflow-hidden">
                            {Array.from({ length: 6 }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className="bg-[var(--color-surface-panel)] px-3.5 py-3 flex flex-col gap-1.5"
                                >
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-6 w-20" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <dl className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-px bg-[var(--color-border-default)] border border-[var(--color-border-default)] rounded-md overflow-hidden">
                            <div className="bg-[var(--color-surface-panel)] px-3.5 py-3">
                                <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                                    {t("hubDetail.temperature")}
                                </dt>
                                <dd className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                                    {current?.temperatureC != null
                                        ? `${current.temperatureC.toFixed(1)}°C`
                                        : "—"}
                                </dd>
                                {current?.apparentTemperatureC != null && (
                                    <div className="text-[10px] font-mono text-slate-500">
                                        {t("hubDetail.feelsLike", {
                                            temp: current.apparentTemperatureC.toFixed(1),
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="bg-[var(--color-surface-panel)] px-3.5 py-3">
                                <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                                    {t("hubDetail.windGust")}
                                </dt>
                                <dd className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                                    {current?.windSpeedMs != null
                                        ? `${current.windSpeedMs.toFixed(1)} m/s`
                                        : "—"}
                                </dd>
                                <div className="text-[10px] font-mono text-slate-500">
                                    {current?.windDirectionDeg != null
                                        ? `${Math.round(current.windDirectionDeg)}°`
                                        : "—"}
                                    {current?.windGustMs != null
                                        ? ` · G ${current.windGustMs.toFixed(1)}`
                                        : ""}
                                </div>
                            </div>

                            <div className="bg-[var(--color-surface-panel)] px-3.5 py-3">
                                <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                                    {t("hubDetail.visibility")}
                                </dt>
                                <dd className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                                    {current?.visibilityM != null
                                        ? `${(current.visibilityM / 1000).toFixed(1)} km`
                                        : "—"}
                                </dd>
                                <div className="text-[10px] font-mono text-slate-500">
                                    {t("hubDetail.cloudPct", { pct: current?.cloudCoverPct ?? 0 })}
                                </div>
                            </div>

                            <div className="bg-[var(--color-surface-panel)] px-3.5 py-3">
                                <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                                    {t("hubDetail.humidity")}
                                </dt>
                                <dd className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                                    {current?.humidityPct != null
                                        ? `${Math.round(current.humidityPct)}%`
                                        : "—"}
                                </dd>
                            </div>

                            <div className="bg-[var(--color-surface-panel)] px-3.5 py-3">
                                <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                                    {t("hubDetail.precip")}
                                </dt>
                                <dd className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                                    {current?.precipitationMm != null
                                        ? `${current.precipitationMm.toFixed(1)} mm`
                                        : "0.0 mm"}
                                </dd>
                            </div>

                            <div className="bg-[var(--color-surface-panel)] px-3.5 py-3">
                                <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                                    {t("hubDetail.pressure")}
                                </dt>
                                <dd className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                                    {current?.pressureHpa != null
                                        ? `${Math.round(current.pressureHpa)} hPa`
                                        : "—"}
                                </dd>
                            </div>
                        </dl>
                    )}

                    {actionableAlerts.length > 0 && (
                        <div className="flex flex-col gap-2 pt-0.5">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                                {t("hubDetail.thresholdAdvisories", {
                                    count: actionableAlerts.length,
                                })}
                            </span>
                            <div className="flex flex-col gap-2">
                                {actionableAlerts.map((alert, idx) => {
                                    const isCrit =
                                        (alert.severity || "").toLowerCase() === "critical";
                                    const hasThreshold =
                                        alert.measuredValue != null && alert.thresholdValue != null;

                                    return (
                                        <TacticalCallout
                                            key={`${alert.type}-${idx}`}
                                            tone={isCrit ? "critical" : "warning"}
                                            icon={AlertTriangle}
                                            title={alert.title || alert.type}
                                            description={
                                                alert.message
                                                    ? localizeServerText(alert.message, locale)
                                                    : undefined
                                            }
                                            rightSlot={
                                                <div className="flex items-center gap-2.5">
                                                    {hasThreshold && (
                                                        <span className="text-[11px] font-mono text-slate-600 tabular-nums">
                                                            {alert.measuredValue} /{" "}
                                                            {alert.thresholdValue}{" "}
                                                            {alert.unit || ""}
                                                        </span>
                                                    )}
                                                    <StatusBadge
                                                        status={alert.severity ?? "warning"}
                                                    />
                                                </div>
                                            }
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </ChamferCard>

            <ChamferCard size="md">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                        {t("hubDetail.forecastHeading", { code: hub.code || hub.name || "HUB" })}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                        {t("hubDetail.hourlySlots", { count: hourlyRows.length })}
                    </span>
                </div>

                {!forecastLoading && hourlyRows.length === 0 ? (
                    <EmptyState
                        icon={CloudSun}
                        title={t("hubDetail.noForecastTitle")}
                        description={t("hubDetail.noForecastDesc")}
                    />
                ) : (
                    <div className="max-h-[380px] overflow-y-auto utm-scroll">
                        <Table fixed={false}>
                            <TableHeader className="sticky top-0 z-10 bg-slate-50">
                                <TableRow>
                                    <TableHead>{t("hubDetail.colTime")}</TableHead>
                                    <TableHead>{t("hubDetail.colCondition")}</TableHead>
                                    <TableHead className="text-right">
                                        {t("hubDetail.colTemp")}
                                    </TableHead>
                                    <TableHead className="text-right">
                                        {t("hubDetail.colWindGust")}
                                    </TableHead>
                                    <TableHead className="text-right">
                                        {t("hubDetail.colPrecip")}
                                    </TableHead>
                                    <TableHead className="text-right">
                                        {t("hubDetail.colVisibility")}
                                    </TableHead>
                                    <TableHead>{t("hubDetail.colFlightOps")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {forecastLoading ? (
                                    <TableLoading
                                        colSpan={7}
                                        rows={4}
                                        message={t("hubDetail.loadingForecast")}
                                    />
                                ) : (
                                    hourlyRows.map((slot, idx) => (
                                        <TableRow key={slot.time ?? idx}>
                                            <TableCell mono darkText>
                                                {slot.time
                                                    ? slot.time.replace("T", " ").slice(5, 16)
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>{slot.conditionSummary || "—"}</TableCell>
                                            <TableCell mono className="text-right tabular-nums">
                                                {slot.temperatureC != null
                                                    ? `${slot.temperatureC.toFixed(1)}°C`
                                                    : "—"}
                                            </TableCell>
                                            <TableCell mono className="text-right tabular-nums">
                                                {slot.windSpeedMs != null
                                                    ? `${slot.windSpeedMs.toFixed(1)} m/s`
                                                    : "—"}
                                                {slot.windGustMs != null
                                                    ? ` (G ${slot.windGustMs.toFixed(1)})`
                                                    : ""}
                                            </TableCell>
                                            <TableCell mono className="text-right tabular-nums">
                                                {slot.precipitationProbabilityPct != null
                                                    ? `${Math.round(slot.precipitationProbabilityPct)}%`
                                                    : "—"}
                                                {slot.precipitationMm != null &&
                                                slot.precipitationMm > 0
                                                    ? ` · ${slot.precipitationMm.toFixed(1)}mm`
                                                    : ""}
                                            </TableCell>
                                            <TableCell mono className="text-right tabular-nums">
                                                {slot.visibilityM != null
                                                    ? `${(slot.visibilityM / 1000).toFixed(1)} km`
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge
                                                    status={slot.flightConditions ?? "unknown"}
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
        </div>
    );
}
