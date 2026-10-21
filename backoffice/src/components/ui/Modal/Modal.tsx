"use client";

import React, { useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import {
  ChamferCard,
  ChamferButton,
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
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const styleMaxWidth =
    typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(styles.modal, className)}
        style={{ maxWidth: styleMaxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <ChamferCard size="lg" accent={accent} className="w-full">
          <div className={styles.modalHeader}>
            <div className={styles.headerLeft}>
              {icon && <span className={styles.icon}>{icon}</span>}
              <h3 className={styles.title}>{title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={styles.closeButton}
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {onSubmit ? (
            <form onSubmit={onSubmit} className={styles.form}>
              {error && <div className={styles.errorAlert}>{error}</div>}
              {children}
              {footer ? (
                footer
              ) : (
                <div className={styles.actions}>
                  <ChamferButton
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                  >
                    {cancelText}
                  </ChamferButton>
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
    </div>
  );
}

export default Modal;
