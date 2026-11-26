"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react";
import { ChamferCard, ChamferButton } from "@/components/ui";

export interface ModalProps {
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
    submitText = "Submit",
    loadingText = "Saving...",
    footer,
}: ModalProps) {
    const styleMaxWidth = typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth;

    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-50 flex items-center justify-center p-4" />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                    <DialogPrimitive.Content asChild aria-describedby={undefined}>
                        <div
                            className="w-full drop-shadow-2xl pointer-events-auto"
                            style={{ maxWidth: styleMaxWidth }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ChamferCard size="lg" className="w-full">
                                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-2">
                                    <DialogPrimitive.Title asChild>
                                        <h2 className="text-base sm:text-[17px] font-bold text-[var(--color-text-primary)] tracking-tight min-w-0 truncate">
                                            {title}
                                        </h2>
                                    </DialogPrimitive.Title>
                                    <DialogPrimitive.Close asChild>
                                        <button
                                            type="button"
                                            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-card)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors -mt-0.5 -mr-1 cursor-pointer shrink-0"
                                            aria-label="Close modal"
                                        >
                                            <X className="w-4 h-4" aria-hidden="true" />
                                        </button>
                                    </DialogPrimitive.Close>
                                </div>

                                {onSubmit ? (
                                    <form
                                        onSubmit={onSubmit}
                                        className="px-4 sm:px-6 py-4 flex flex-col gap-3.5 max-h-[calc(85vh-70px)] overflow-y-auto overscroll-contain"
                                        noValidate
                                    >
                                        {children}
                                        {footer ? (
                                            footer
                                        ) : (
                                            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3.5 border-t border-[var(--color-border-subtle)]">
                                                <ChamferButton
                                                    variant="outline"
                                                    size="sm"
                                                    clip="xs"
                                                    type="button"
                                                    onClick={onClose}
                                                    disabled={loading}
                                                >
                                                    Cancel
                                                </ChamferButton>
                                                <ChamferButton
                                                    variant="dark"
                                                    size="sm"
                                                    clip="sm"
                                                    type="submit"
                                                    disabled={loading}
                                                >
                                                    {loading ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <span>{loadingText}</span>
                                                        </>
                                                    ) : (
                                                        <span>{submitText}</span>
                                                    )}
                                                </ChamferButton>
                                            </div>
                                        )}
                                    </form>
                                ) : (
                                    <div className="px-4 sm:px-6 py-4 flex flex-col gap-3.5 max-h-[calc(85vh-70px)] overflow-y-auto overscroll-contain">
                                        {children}
                                        {footer && (
                                            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3.5 border-t border-[var(--color-border-subtle)]">
                                                {footer}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ChamferCard>
                        </div>
                    </DialogPrimitive.Content>
                </div>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
