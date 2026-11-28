"use client";

import React from "react";
import { useTranslations } from "next-intl";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react";
import { ChamferCard } from "./ChamferCard";
import { ChamferButton } from "./ChamferButton";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    maxWidth?: string | number;
    children: React.ReactNode;

    onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
    loading?: boolean;
    submitText?: string;
    loadingText?: string;
    footer?: React.ReactNode;
}

export function Modal({
    isOpen,
    onClose,
    title,
    maxWidth = "480px",
    children,
    onSubmit,
    loading = false,
    submitText,
    loadingText,
    footer,
}: ModalProps) {
    const t = useTranslations("common");
    const resolvedSubmitText = submitText ?? t("submit");
    const resolvedLoadingText = loadingText ?? t("saving");
    const styleMaxWidth = typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth;

    const defaultSubmitFooter = (
        <>
            <ChamferButton
                variant="outline"
                size="sm"
                clip="xs"
                type="button"
                onClick={onClose}
                disabled={loading}
            >
                {t("cancel")}
            </ChamferButton>
            <ChamferButton variant="dark" size="sm" clip="sm" type="submit" disabled={loading}>
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{resolvedLoadingText}</span>
                    </>
                ) : (
                    <span>{resolvedSubmitText}</span>
                )}
            </ChamferButton>
        </>
    );

    const resolvedFooter = footer ?? (onSubmit ? defaultSubmitFooter : null);

    const bodyAndFooter = (
        <>
            <div className="px-4 sm:px-6 py-4 flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain space-y-3.5">
                {children}
            </div>
            {resolvedFooter && (
                <div className="px-4 sm:px-6 py-3.5 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-panel)] flex flex-wrap items-center justify-end gap-2.5 shrink-0">
                    {resolvedFooter}
                </div>
            )}
        </>
    );

    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-50 flex items-center justify-center p-4" />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                    <DialogPrimitive.Content asChild aria-describedby={undefined}>
                        <div
                            className="w-full max-h-[calc(100dvh-2rem)] flex flex-col drop-shadow-2xl pointer-events-auto"
                            style={{ maxWidth: styleMaxWidth }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ChamferCard
                                size="lg"
                                className="w-full max-h-[calc(100dvh-2rem)] overflow-hidden"
                            >
                                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-2 shrink-0">
                                    <DialogPrimitive.Title asChild>
                                        <h2 className="text-base sm:text-[17px] font-bold text-[var(--color-text-primary)] tracking-tight min-w-0 truncate">
                                            {title}
                                        </h2>
                                    </DialogPrimitive.Title>
                                    <DialogPrimitive.Close asChild>
                                        <button
                                            type="button"
                                            className="w-7 h-7 rounded border border-transparent hover:border-[var(--color-border-default)] flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-card)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors -mt-0.5 -mr-1 cursor-pointer shrink-0"
                                            aria-label={t("closeModal")}
                                        >
                                            <X className="w-4 h-4" aria-hidden="true" />
                                        </button>
                                    </DialogPrimitive.Close>
                                </div>

                                {onSubmit ? (
                                    <form
                                        onSubmit={onSubmit}
                                        className="flex flex-col flex-1 min-h-0 overflow-hidden"
                                        noValidate
                                    >
                                        {bodyAndFooter}
                                    </form>
                                ) : (
                                    bodyAndFooter
                                )}
                            </ChamferCard>
                        </div>
                    </DialogPrimitive.Content>
                </div>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
