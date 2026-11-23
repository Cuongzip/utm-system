"use client";

import { useState } from "react";
import { AlertCircle, X } from "lucide-react";

export interface AlertBannerProps {
    message: string;
    onDismiss?: () => void;
}

export function AlertBanner({ message, onDismiss }: AlertBannerProps) {
    const [visible, setVisible] = useState(true);

    if (!visible) return null;

    const handleDismiss = () => {
        setVisible(false);
        onDismiss?.();
    };

    return (
        <div className="p-3 border text-xs rounded-md flex items-center justify-between w-full transition-all bg-[var(--color-status-alert-bg)] border-[var(--color-status-alert-border)] text-[var(--color-status-alert-text)]">
            <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
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
