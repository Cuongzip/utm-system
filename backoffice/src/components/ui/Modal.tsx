"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react";
import { ChamferCard, ChamferButton, type ChamferButtonVariant } from "@/components/ui";
import { cn } from "@/lib";

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    icon?: React.ReactNode;
    maxWidth?: string | number;
    className?: string;
    children: React.ReactNode;

    onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
    loading?: boolean;
    error?: string | null;
    submitText?: string;
    cancelText?: string;
    loadingText?: string;
    submitDisabled?: boolean;
    submitVariant?: ChamferButtonVariant;
    footer?: React.ReactNode;
}

export function Modal({
    isOpen,
    onClose,
    title,
    icon,
    maxWidth = "480px",
    className,
    children,
    onSubmit,
    loading = false,
    error = null,
    submitText = "Submit",
    cancelText = "Cancel",
    loadingText = "Saving...",
    submitDisabled = false,
    submitVariant = "dark",
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
                            className={cn("w-full drop-shadow-2xl pointer-events-auto", className)}
                            style={{ maxWidth: styleMaxWidth }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ChamferCard size="lg" className="w-full">
                                <div className="px-6 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        {icon && (
                                            <span className="flex items-center justify-center">
                                                {icon}
                                            </span>
                                        )}
                                        <DialogPrimitive.Title asChild>
                                            <h3 className="text-[17px] font-bold text-[var(--color-text-primary)] tracking-tight">
                                                {title}
                                            </h3>
                                        </DialogPrimitive.Title>
                                    </div>
                                    <DialogPrimitive.Close asChild>
                                        <button
                                            type="button"
                                            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-card)] hover:text-[var(--color-text-primary)] transition-all -mt-0.5 -mr-1"
                                            aria-label="Close modal"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </DialogPrimitive.Close>
                                </div>

                                {onSubmit ? (
                                    <form
                                        onSubmit={onSubmit}
                                        className="px-6 py-4 flex flex-col gap-3.5 max-h-[calc(85vh-70px)] overflow-y-auto"
                                        noValidate
                                    >
                                        {error && (
                                            <div className="p-3 bg-[var(--color-status-alert-bg)] border border-[var(--color-status-alert-border)] text-[var(--color-status-alert-text)] text-xs rounded-md">
                                                {error}
                                            </div>
                                        )}
                                        {children}
                                        {footer ? (
                                            footer
                                        ) : (
                                            <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-[var(--color-border-subtle)]">
                                                <ChamferButton
                                                    variant="outline"
                                                    size="sm"
                                                    clip="xs"
                                                    type="button"
                                                    onClick={onClose}
                                                    disabled={loading}
                                                >
                                                    {cancelText}
                                                </ChamferButton>
                                                <ChamferButton
                                                    variant={
                                                        submitVariant === "danger"
                                                            ? "dark"
                                                            : submitVariant
                                                    }
                                                    size="sm"
                                                    clip="sm"
                                                    type="submit"
                                                    disabled={loading || submitDisabled}
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
                                    <div className="px-6 py-4 flex flex-col gap-3.5 max-h-[calc(85vh-70px)] overflow-y-auto">
                                        {error && (
                                            <div className="p-3 bg-[var(--color-status-alert-bg)] border border-[var(--color-status-alert-border)] text-[var(--color-status-alert-text)] text-xs rounded-md">
                                                {error}
                                            </div>
                                        )}
                                        {children}
                                        {footer && (
                                            <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-[var(--color-border-subtle)]">
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

export default Modal;
