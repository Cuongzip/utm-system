"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { isHubWaypointItem, type WaypointItem } from "../types";

interface WaypointEditorHeaderProps {
    waypoint: WaypointItem;
    onClose: () => void;
}

export function WaypointEditorHeader({ waypoint, onClose }: WaypointEditorHeaderProps) {
    const t = useTranslations("waypoints.editor");
    const tCommon = useTranslations("common");
    const isHubNode = isHubWaypointItem(waypoint);
    return (
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-2.5">
            <span className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wide">
                {t(isHubNode ? "hubHeaderTitle" : "headerTitle", { seq: waypoint.sequence ?? 1 })}
            </span>
            <button
                type="button"
                onClick={onClose}
                className="px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded hover:bg-[var(--color-surface-card)] cursor-pointer flex items-center gap-1"
            >
                <X className="w-3.5 h-3.5" />
                <span>{tCommon("close")}</span>
            </button>
        </div>
    );
}
