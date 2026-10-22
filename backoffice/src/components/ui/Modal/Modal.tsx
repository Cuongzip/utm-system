"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react";
import {
    ChamferCard,
    ChamferButton,
    OutlineButton,
    type ChamferButtonVariant,
    type ChamferAccent,
} from "@/components/ui";
import { cn } from "@/lib";
import styles from "./Modal.module.css";

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    icon?: React.ReactNode;
    maxWidth?: string | number;
    accent?: ChamferAccent;
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
    accent = "dark",
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
                <DialogPrimitive.Overlay className={styles.overlay} />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                    <DialogPrimitive.Content asChild aria-describedby={undefined}>
                        <div
                            className={cn(styles.modal, "pointer-events-auto", className)}
                            style={{ maxWidth: styleMaxWidth }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ChamferCard size="lg" accent={accent} className="w-full">
                                <div className={styles.modalHeader}>
                                    <div className={styles.headerLeft}>
                                        {icon && <span className={styles.icon}>{icon}</span>}
                                        <DialogPrimitive.Title asChild>
                                            <h3 className={styles.title}>{title}</h3>
                                        </DialogPrimitive.Title>
                                    </div>
                                    <DialogPrimitive.Close asChild>
                                        <button
                                            type="button"
                                            className={styles.closeButton}
                                            aria-label="Close modal"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </DialogPrimitive.Close>
                                </div>

                                {onSubmit ? (
                                    <form onSubmit={onSubmit} className={styles.form} noValidate>
                                        {error && <div className={styles.errorAlert}>{error}</div>}
                                        {children}
                                        {footer ? (
                                            footer
                                        ) : (
                                            <div className={styles.actions}>
                                                <OutlineButton
                                                    size="sm"
                                                    type="button"
                                                    onClick={onClose}
                                                    disabled={loading}
                                                >
                                                    {cancelText}
                                                </OutlineButton>
                                                <ChamferButton
                                                    variant={submitVariant}
                                                    size="sm"
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
                                    <div className={styles.body}>
                                        {error && <div className={styles.errorAlert}>{error}</div>}
                                        {children}
                                        {footer && <div className={styles.actions}>{footer}</div>}
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
