"use client";

import { useTranslations } from "next-intl";
import { ScrollText } from "lucide-react";
import { StatusBadge, EmptyState } from "@/components/ui";
import { useEntityCodeMap } from "@/hooks";
import { useAppLocale } from "@/i18n";
import { formatTime, localizeServerText, localizeSimEventType, localizeSimScenario } from "@/utils";
import type { SimulationEvent } from "@/types";

interface SimulationEventsTabProps {
    events: SimulationEvent[];
}

export function SimulationEventsTab({ events }: SimulationEventsTabProps) {
    const t = useTranslations("simulation.liveFeed");
    const locale = useAppLocale();
    const entityMap = useEntityCodeMap();

    return (
        <div className="p-4">
            {events.length === 0 ? (
                <EmptyState
                    compact
                    icon={ScrollText}
                    title={t("emptyEventsTitle")}
                    description={t("emptyEventsDesc")}
                />
            ) : (
                <div className="flex flex-col divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                    {[...events].reverse().map((evt, idx) => {
                        const timeStr = formatTime(evt.createdOn);
                        return (
                            <div
                                key={evt.id || idx}
                                className="py-2.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono font-semibold text-slate-400 shrink-0 tabular-nums">
                                        {timeStr}
                                    </span>
                                    <StatusBadge
                                        status={evt.severity || "info"}
                                        dotShape="circle"
                                    />
                                    {evt.scenario && (
                                        <span className="text-[11px] font-mono text-slate-500 uppercase">
                                            [{localizeSimScenario(evt.scenario, locale)}]
                                        </span>
                                    )}
                                    <span className="text-xs font-mono text-slate-800">
                                        {evt.message
                                            ? localizeServerText(evt.message, locale, {
                                                  entityMap,
                                              })
                                            : evt.type
                                              ? localizeSimEventType(evt.type, locale)
                                              : t("eventFallback")}
                                    </span>
                                </div>

                                {evt.type && (
                                    <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0">
                                        {localizeSimEventType(evt.type, locale)}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
