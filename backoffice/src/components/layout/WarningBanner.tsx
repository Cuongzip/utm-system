"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

interface WarningBannerProps {
    message?: string;
    detailUrl?: string;
}

export function WarningBanner({
    message = "Battery at 32% — monitoring closely",
}: WarningBannerProps) {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <aside className="w-full bg-[#fef3c7] border-b border-[#fcd34d] px-4 py-2 flex items-center justify-between text-xs text-amber-950 transition-all duration-200 z-50 shrink-0">
            <div className="flex items-center space-x-2 font-medium tracking-wide">
                <span className="flex items-center text-amber-700 font-bold uppercase tracking-wider text-[11px] font-mono">
                    <AlertTriangle className="w-4 h-4 mr-1 text-amber-600 inline" />
                    WARNING
                </span>
                <span className="text-amber-400 font-bold">•</span>
                <span>{message}</span>
            </div>

            <div className="flex items-center space-x-4">
                <button
                    type="button"
                    className="font-semibold underline text-amber-900 hover:text-amber-950 transition-colors cursor-pointer"
                >
                    View Details
                </button>
                <button
                    type="button"
                    aria-label="Dismiss alert"
                    onClick={() => setIsVisible(false)}
                    className="text-amber-700 hover:text-amber-950 text-base leading-none p-0.5 rounded focus:outline-hidden cursor-pointer"
                >
                    ×
                </button>
            </div>
        </aside>
    );
}

export default WarningBanner;
