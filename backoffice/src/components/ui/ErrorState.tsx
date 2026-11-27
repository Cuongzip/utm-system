"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, RotateCw } from "lucide-react";
import { cn } from "@/lib";
import { ChamferCard } from "./ChamferCard";
import { ChamferButton } from "./ChamferButton";

export interface ErrorStateProps {
    title?: string;
    description?: string;
    onRetry?: () => void;
    retrying?: boolean;
    compact?: boolean;
    wrapped?: boolean;
    className?: string;
}

export function ErrorState({
    title,
    description,
    onRetry,
    retrying = false,
    compact = false,
    wrapped = true,
    className,
}: ErrorStateProps) {
    const t = useTranslations("common");
    const resolvedTitle = title ?? t("failedToLoad");
    const resolvedDesc = description ?? t("failedToLoadDesc");

    const content = (
        <div
            role="alert"
            className={cn(
                "flex flex-col items-center justify-center text-center w-full",
                compact ? "py-5 px-3" : "py-10 px-4",
                className
            )}
        >
            <div
                className={cn(
                    "rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600",
                    compact ? "w-8 h-8 mb-2" : "w-11 h-11 mb-3"
                )}
            >
                <AlertCircle className={compact ? "w-4 h-4" : "w-5 h-5"} aria-hidden="true" />
            </div>
            <h3
                className={cn(
                    "font-semibold font-mono text-slate-900",
                    compact ? "text-xs" : "text-sm"
                )}
            >
                {resolvedTitle}
            </h3>
            {resolvedDesc && (
                <p
                    className={cn(
                        "text-slate-500 mt-1 max-w-md",
                        compact ? "text-[11px] leading-relaxed" : "text-xs"
                    )}
                >
                    {resolvedDesc}
                </p>
            )}
            {onRetry && (
                <ChamferButton
                    variant="outline"
                    size="sm"
                    clip="xs"
                    onClick={onRetry}
                    disabled={retrying}
                    className="mt-3.5"
                >
                    <RotateCw
                        className={cn("w-3.5 h-3.5 text-slate-600", retrying && "animate-spin")}
                        aria-hidden="true"
                    />
                    <span>{retrying ? t("retrying") : t("retry")}</span>
                </ChamferButton>
            )}
        </div>
    );

    if (!wrapped) return content;

    return <ChamferCard size="lg">{content}</ChamferCard>;
}
