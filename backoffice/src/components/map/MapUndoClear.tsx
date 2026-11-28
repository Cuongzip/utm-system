"use client";

import { useTranslations } from "next-intl";
import { Undo2, Trash2 } from "lucide-react";

export interface MapUndoClearProps {
    onUndo: () => void;
    onClear: () => void;
    disabled: boolean;
}

export function MapUndoClear({ onUndo, onClear, disabled }: MapUndoClearProps) {
    const t = useTranslations("map");
    return (
        <div className="flex items-center h-[34px] gap-1 bg-[var(--color-surface-card)] p-1 rounded border border-[var(--color-border-default)]">
            <button
                type="button"
                onClick={onUndo}
                disabled={disabled}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                title={t("undoTitle")}
            >
                <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t("undo")}</span>
            </button>
            <button
                type="button"
                onClick={onClear}
                disabled={disabled}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded text-red-600 hover:bg-red-50 disabled:text-slate-400 disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                title={t("clearTitle")}
            >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t("clear")}</span>
            </button>
        </div>
    );
}
