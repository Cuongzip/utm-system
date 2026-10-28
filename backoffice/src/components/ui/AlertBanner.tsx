"use client";

import { useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { cn } from "@/lib";

export interface AlertBannerProps {
    message: string;
    variant?: "alert" | "warning" | "success" | "info";
    onDismiss?: () => void;
    className?: string;
}

export function AlertBanner({
    message,
    variant = "alert",
    onDismiss,
    className,
}: AlertBannerProps) {
    const [visible, setVisible] = useState(true);

    if (!visible) return null;

    const handleDismiss = () => {
        setVisible(false);
        onDismiss?.();
    };

    const variantStyles =
        variant === "warning"
            ? "bg-[var(--color-status-connecting-bg)] border-[var(--color-status-connecting-border)] text-[var(--color-status-connecting-text)]"
            : variant === "success"
              ? "bg-[var(--color-status-online-bg)] border-[var(--color-status-online-border)] text-[var(--color-status-online-text)]"
              : variant === "info"
                ? "bg-[var(--color-surface-card)] border-[var(--color-border-strong)] text-[var(--color-border-dark)]"
                : "bg-[var(--color-status-alert-bg)] border-[var(--color-status-alert-border)] text-[var(--color-status-alert-text)]";

    const Icon =
        variant === "warning"
            ? AlertTriangle
            : variant === "success"
              ? CheckCircle
              : variant === "info"
                ? Info
                : AlertCircle;

    return (
        <div
            className={cn(
                "p-3 border text-xs rounded-md flex items-center justify-between w-full transition-all",
                variantStyles,
                className
            )}
        >
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-medium">{message}</span>
            </div>

            <button
                type="button"
                onClick={handleDismiss}
                className="opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer"
                aria-label="Dismiss alert"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

export default AlertBanner;
