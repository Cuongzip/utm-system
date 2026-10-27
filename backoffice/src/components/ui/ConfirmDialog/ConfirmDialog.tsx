"use client";

import React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { ChamferCard, ChamferButton, OutlineButton } from "@/components/ui";
import { cn } from "@/lib";

export interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: React.ReactNode;
    description: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "default";
    loading?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "danger",
    loading = false,
}: ConfirmDialogProps) {
    return (
        <AlertDialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogPrimitive.Portal>
                <AlertDialogPrimitive.Overlay className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs z-50 transition-opacity" />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                    <AlertDialogPrimitive.Content asChild>
                        <div
                            className="w-full max-w-md pointer-events-auto filter drop-shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ChamferCard size="lg" className="w-full">
                                <div className="p-5 flex flex-col gap-4">
                                    <div className="flex items-start gap-3.5">
                                        <div
                                            className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                                variant === "danger"
                                                    ? "bg-red-50 text-red-600 border border-red-200"
                                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                            )}
                                        >
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>

                                        <div className="flex flex-col gap-1 text-left">
                                            <AlertDialogPrimitive.Title className="text-base font-bold text-slate-900 leading-snug">
                                                {title}
                                            </AlertDialogPrimitive.Title>
                                            <AlertDialogPrimitive.Description className="text-xs text-slate-600 leading-relaxed">
                                                {description}
                                            </AlertDialogPrimitive.Description>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                        <AlertDialogPrimitive.Cancel asChild>
                                            <OutlineButton
                                                size="sm"
                                                onClick={onClose}
                                                disabled={loading}
                                            >
                                                {cancelText}
                                            </OutlineButton>
                                        </AlertDialogPrimitive.Cancel>

                                        <AlertDialogPrimitive.Action asChild>
                                            <ChamferButton
                                                variant={variant === "danger" ? "danger" : "dark"}
                                                size="sm"
                                                onClick={async (e) => {
                                                    e.preventDefault();
                                                    await onConfirm();
                                                }}
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <>
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        <span>Processing...</span>
                                                    </>
                                                ) : (
                                                    <span>{confirmText}</span>
                                                )}
                                            </ChamferButton>
                                        </AlertDialogPrimitive.Action>
                                    </div>
                                </div>
                            </ChamferCard>
                        </div>
                    </AlertDialogPrimitive.Content>
                </div>
            </AlertDialogPrimitive.Portal>
        </AlertDialogPrimitive.Root>
    );
}

export default ConfirmDialog;
