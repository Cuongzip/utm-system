"use client";

import { Toaster as SonnerToaster } from "sonner";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib";

import styles from "./Toaster.module.css";

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
            className={cn(styles.toaster, className)}
            icons={{
                success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
                error: <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />,
                info: <Info className="w-4 h-4 text-slate-600 shrink-0" />,
                warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
                close: <X className="w-3.5 h-3.5" />,
            }}
            toastOptions={{
                unstyled: true,
                className: styles.toast,
            }}
        />
    );
}

export default Toaster;
