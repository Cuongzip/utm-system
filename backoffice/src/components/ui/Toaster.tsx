"use client";

import { Toaster as SonnerToaster } from "sonner";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export function Toaster() {
    return (
        <SonnerToaster
            position="top-right"
            duration={4000}
            closeButton
            richColors={false}
            offset={20}
            icons={{
                success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
                error: <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />,
                info: <Info className="w-4 h-4 text-slate-600 shrink-0" />,
                warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
                close: <X className="w-3.5 h-3.5" />,
            }}
            toastOptions={{
                classNames: {
                    toast: "chamfer-sm bg-white border border-slate-300 p-3 pr-10 text-xs shadow-lg flex items-center gap-2.5 w-[356px] max-w-[calc(100vw-2rem)] text-slate-900",
                    title: "text-xs font-semibold text-slate-900 leading-tight",
                    description: "text-[11px] text-slate-500 mt-0.5",
                    closeButton:
                        "!left-auto !right-2.5 !top-2.5 !transform-none border border-slate-200 bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors",
                },
            }}
        />
    );
}
