"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, BellRing, Siren } from "lucide-react";
import {
    ALERT_FAB_OFFSET_STORAGE_KEY,
    COPILOT_OFFSET_STORAGE_KEY,
    FLOATING_FAB_GAP_PX,
    FLOATING_FAB_SIZE_PX,
    useFloatingPosition,
    type ViewportOffset,
} from "@/hooks";
import { useLiveAlerts } from "@/hooks/useLiveAlerts";
import { cn } from "@/lib";
import { IS_COCKPIT_PATH_RE, type AlertSeverityTier } from "./alertUtils";

export interface AlertCenterTriggerProps {
    variant?: "fab" | "icon";
    tone?: "light" | "dark";
    className?: string;
}

const DEFAULT_FAB_OFFSET: ViewportOffset = {
    right: 20,
    bottom: 20 + FLOATING_FAB_SIZE_PX + FLOATING_FAB_GAP_PX,
};

const ICON_BADGE_CLASS: Record<AlertSeverityTier, string> = {
    critical: "bg-red-600 text-white",
    warning: "bg-amber-500 text-white",
    advisory: "bg-slate-700 text-white",
};

const LIGHT_ICON_BTN_CLASS: Record<AlertSeverityTier, string> = {
    critical: "border-red-200 bg-red-50/75 text-red-700 hover:bg-red-100/80 hover:border-red-300",
    warning:
        "border-amber-200 bg-amber-50/75 text-amber-800 hover:bg-amber-100/80 hover:border-amber-300",
    advisory: "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200/80",
};

const DARK_ICON_BTN_CLASS: Record<AlertSeverityTier, string> = {
    critical: "border-red-600/80 bg-red-950/85 text-red-100 hover:bg-red-900/85",
    warning: "border-amber-500/75 bg-amber-950/75 text-amber-100 hover:bg-amber-900/75",
    advisory: "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700",
};

export function AlertCenterTrigger({
    variant = "icon",
    tone = "light",
    className,
}: AlertCenterTriggerProps) {
    const pathname = usePathname();
    const t = useTranslations("alerts");
    const { totalCount, highestTier, isDrawerOpen, openDrawer } = useLiveAlerts();
    const { activeOffset, isDragging, startDrag, moveDrag, endDrag, cancelDrag } =
        useFloatingPosition({
            storageKey: ALERT_FAB_OFFSET_STORAGE_KEY,
            defaultOffset: DEFAULT_FAB_OFFSET,
            boxSize: FLOATING_FAB_SIZE_PX,
            fallbackAnchorStorageKey: COPILOT_OFFSET_STORAGE_KEY,
            fallbackAnchorGapY: FLOATING_FAB_GAP_PX,
        });

    const hasAlerts = totalCount > 0 && highestTier !== null;
    const countText = totalCount > 99 ? "99+" : String(totalCount);
    const ariaLabel = hasAlerts
        ? t("openAlertCenterWithCount", { count: totalCount })
        : t("openAlertCenter");

    if (variant === "fab") {
        if (pathname && IS_COCKPIT_PATH_RE.test(pathname)) {
            return null;
        }

        return (
            <button
                type="button"
                title={t("fabTooltip")}
                aria-label={ariaLabel}
                aria-expanded={isDrawerOpen}
                aria-haspopup="dialog"
                tabIndex={isDrawerOpen ? -1 : undefined}
                style={{ right: `${activeOffset.right}px`, bottom: `${activeOffset.bottom}px` }}
                onPointerDown={(e) =>
                    startDrag(e, activeOffset, FLOATING_FAB_SIZE_PX, FLOATING_FAB_SIZE_PX)
                }
                onPointerMove={moveDrag}
                onPointerUp={(e) => endDrag(e, openDrawer)}
                onPointerCancel={cancelDrag}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openDrawer();
                    }
                }}
                className={cn(
                    "group fixed z-40 h-10 w-10 flex items-center justify-center touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
                    isDrawerOpen
                        ? "opacity-0 pointer-events-none"
                        : isDragging
                          ? "cursor-grabbing scale-105"
                          : "cursor-grab transition-transform",
                    className
                )}
            >
                <span className="w-full h-full p-[1.5px] chamfer-sm bg-slate-400/90 group-hover:bg-slate-300 drop-shadow-[0_8px_20px_rgba(15,23,42,0.28)] flex items-center justify-center transition-colors pointer-events-none">
                    <span className="w-full h-full chamfer-sm bg-slate-800 group-hover:bg-slate-700 text-white flex items-center justify-center transition-colors">
                        <Bell className="w-[18px] h-[18px] text-white" aria-hidden="true" />
                    </span>
                </span>

                {hasAlerts && (
                    <span className="absolute -top-1 -right-1 z-10 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold tabular-nums leading-none flex items-center justify-center shadow-[0_2px_6px_rgba(15,23,42,0.35)] pointer-events-none">
                        {countText}
                    </span>
                )}
            </button>
        );
    }

    const Icon = !hasAlerts ? Bell : highestTier === "critical" ? Siren : BellRing;

    return (
        <button
            type="button"
            onClick={openDrawer}
            title={ariaLabel}
            aria-label={ariaLabel}
            aria-expanded={isDrawerOpen}
            aria-haspopup="dialog"
            className={cn(
                "relative inline-flex items-center justify-center gap-1.5 rounded-md border font-mono text-[11px] font-bold transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                tone === "dark" ? "h-7" : "h-8",
                hasAlerts ? "pl-2 pr-1.5" : tone === "dark" ? "w-7" : "w-8",
                isDrawerOpen
                    ? tone === "dark"
                        ? "border-slate-200 bg-slate-200 text-slate-950"
                        : "border-slate-400 bg-slate-100 text-slate-900"
                    : tone === "dark"
                      ? hasAlerts
                          ? DARK_ICON_BTN_CLASS[highestTier]
                          : "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                      : hasAlerts
                        ? LIGHT_ICON_BTN_CLASS[highestTier]
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300",
                className
            )}
        >
            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {hasAlerts && (
                <span
                    className={cn(
                        "min-w-[18px] h-[18px] px-1 rounded-[4px] inline-flex items-center justify-center text-[10px] font-mono font-bold tabular-nums leading-none",
                        ICON_BADGE_CLASS[highestTier]
                    )}
                >
                    {countText}
                </span>
            )}
        </button>
    );
}
