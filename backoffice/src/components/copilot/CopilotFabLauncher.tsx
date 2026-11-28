"use client";

import { useTranslations } from "next-intl";
import { Bot } from "lucide-react";
import { FLOATING_FAB_SIZE_PX, type ViewportOffset } from "@/hooks";

interface CopilotFabLauncherProps {
    activeOffset: ViewportOffset;
    isDragging: boolean;
    startDrag: (
        e: React.PointerEvent<HTMLElement>,
        originOffset: ViewportOffset,
        boxWidth: number,
        boxHeight: number
    ) => void;
    moveDrag: (e: React.PointerEvent<HTMLElement>) => void;
    endDrag: (e: React.PointerEvent<HTMLElement>, onTap?: () => void) => void;
    cancelDrag: (e: React.PointerEvent<HTMLElement>) => void;
    onOpen: () => void;
}

export function CopilotFabLauncher({
    activeOffset,
    isDragging,
    startDrag,
    moveDrag,
    endDrag,
    cancelDrag,
    onOpen,
}: CopilotFabLauncherProps) {
    const t = useTranslations("copilot");

    return (
        <button
            type="button"
            aria-label={t("openLabel")}
            title={t("launcherTooltip")}
            style={{ right: `${activeOffset.right}px`, bottom: `${activeOffset.bottom}px` }}
            onPointerDown={(e) =>
                startDrag(e, activeOffset, FLOATING_FAB_SIZE_PX, FLOATING_FAB_SIZE_PX)
            }
            onPointerMove={moveDrag}
            onPointerUp={(e) => endDrag(e, onOpen)}
            onPointerCancel={cancelDrag}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen();
                }
            }}
            className={`group fixed z-40 h-10 w-10 p-[1.5px] chamfer-sm bg-slate-400/90 hover:bg-slate-300 drop-shadow-[0_8px_20px_rgba(15,23,42,0.28)] flex items-center justify-center touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
                isDragging ? "cursor-grabbing scale-105" : "cursor-grab transition-transform"
            }`}
        >
            <span className="w-full h-full chamfer-sm bg-slate-800 group-hover:bg-slate-700 text-white flex items-center justify-center transition-colors pointer-events-none">
                <Bot className="w-[18px] h-[18px] text-white" aria-hidden="true" />
            </span>
        </button>
    );
}
