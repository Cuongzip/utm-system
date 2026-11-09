"use client";

import { Toaster as SonnerToaster } from "sonner";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export interface ToasterProps {
    position?:
        "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center";
    duration?: number;
    className?: string;
}

export function Toaster({ position = "top-right", duration = 3200, className }: ToasterProps) {
    return (
        <SonnerToaster
            position={position}
            duration={duration}
            closeButton
            richColors={false}
            offset={20}
            className={className}
            icons={{
                success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
                error: <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />,
                info: <Info className="w-4 h-4 text-slate-600 shrink-0" />,
                warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
                close: <X className="w-3.5 h-3.5" />,
            }}
            toastOptions={{
                classNames: {
                    toast: "chamfer-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-3 pr-10 text-xs shadow-lg flex items-center gap-2.5 w-[356px] text-slate-900 dark:text-slate-100",
                    title: "text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight",
                    description: "text-[11px] text-slate-500 dark:text-slate-400 mt-0.5",
                    closeButton:
                        "!left-auto !right-2.5 !top-2.5 !transform-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors",
                },
            }}
        />
    );
}
