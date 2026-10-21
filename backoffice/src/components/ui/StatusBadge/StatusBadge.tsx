"use client";

import { cn } from "@/lib";
import styles from "./StatusBadge.module.css";

export type StatusType =
    | "online"
    | "offline"
    | "connecting"
    | "alert"
    | "active"
    | "available"
    | "idle"
    | "in_flight"
    | "in flight"
    | "charging"
    | "maintenance"
    | "inactive"
    | string;

interface StatusBadgeProps {
    status: StatusType;
    label?: string;
    showDot?: boolean;
    className?: string;
}

export function StatusBadge({ status, label, showDot = true, className }: StatusBadgeProps) {
    const normalized = String(status || "")
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

    const variantClass =
        normalized === "online" ||
        normalized === "live" ||
        normalized === "active" ||
        normalized === "available" ||
        normalized === "conforming" ||
        normalized === "approved" ||
        normalized === "completed" ||
        normalized === "success"
            ? styles.online
            : normalized === "connecting" ||
                normalized === "maintenance" ||
                normalized === "charging" ||
                normalized === "pending" ||
                normalized === "idle" ||
                normalized === "contingent"
              ? styles.connecting
              : normalized === "alert" ||
                  normalized === "error" ||
                  normalized === "failed" ||
                  normalized === "non_conforming" ||
                  normalized === "cancelled"
                ? styles.alert
                : normalized === "in_flight" ||
                    normalized === "returning" ||
                    normalized === "pre_flight"
                  ? styles.inFlight
                  : styles.offline;

    const displayLabel = label || String(status || "").replace(/_/g, " ");

    return (
        <span className={cn(styles.badge, variantClass, className)}>
            {showDot && <span className={styles.dot} />}
            <span>{displayLabel}</span>
        </span>
    );
}

export default StatusBadge;
