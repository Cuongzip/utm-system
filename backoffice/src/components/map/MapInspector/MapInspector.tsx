"use client";

import React from "react";
import { X } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib";
import styles from "./MapInspector.module.css";

export interface MapInspectorMetaItem {
    label: string;
    value: React.ReactNode;
}

export interface MapInspectorProps {
    code?: string;
    title?: React.ReactNode;
    badge?: React.ReactNode;
    metaItems?: MapInspectorMetaItem[];
    onClose: () => void;
    closeTooltip?: string;
    accentColor?: "cyan" | "default" | "amber" | "red";
    className?: string;
    children?: React.ReactNode;
}

const ACCENT_CLASS_MAP: Record<NonNullable<MapInspectorProps["accentColor"]>, string> = {
    cyan: styles.accentCyan,
    default: styles.accentDefault,
    amber: styles.accentAmber,
    red: styles.accentRed,
};

export function MapInspector({
    code,
    title,
    badge,
    metaItems = [],
    onClose,
    closeTooltip = "Close inspector",
    accentColor = "default",
    className,
    children,
}: MapInspectorProps) {
    const accentClass = ACCENT_CLASS_MAP[accentColor] || styles.accentDefault;

    return (
        <div className={cn(styles.inspectorWrapper, accentClass, className)}>
            <div className={styles.inspectorInner}>
                <div className={styles.leftSection}>
                    {(code || title || badge) && (
                        <div className={styles.titleRow}>
                            {code && <span className={styles.codeText}>{code}</span>}
                            {title && <span className={styles.titleText}>{title}</span>}
                            {badge}
                        </div>
                    )}

                    {metaItems.length > 0 && (
                        <div className={styles.metaRow}>
                            {metaItems.map((item, idx) => (
                                <span key={idx} className={styles.metaItem}>
                                    <span>{item.label}:</span>
                                    <span className={styles.metaValue}>{item.value}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    {children}
                </div>

                <Tooltip content={closeTooltip} side="left">
                    <button
                        type="button"
                        onClick={onClose}
                        className={styles.closeButton}
                        aria-label={closeTooltip}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
}

export default MapInspector;
