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
    | "critical"
    | "high"
    | "medium"
    | "low"
    | "ok"
    | "no_fly_zone"
    | string;

export type DotShape = "diamond" | "circle";

export interface StatusBadgeProps {
    status: StatusType;
    label?: string;
    showDot?: boolean;
    shape?: "chamfer" | "rounded" | "diamond" | "circle";
    dotShape?: DotShape;
    className?: string;
}

export function StatusBadge({
    status,
    label,
    showDot = true,
    shape,
    dotShape,
    className,
}: StatusBadgeProps) {
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
        normalized === "success" ||
        normalized === "resolved" ||
        normalized === "ok"
            ? styles.online
            : normalized === "alert" ||
                normalized === "error" ||
                normalized === "failed" ||
                normalized === "aborted" ||
                normalized === "non_conforming" ||
                normalized === "cancelled" ||
                normalized === "no_fly_zone" ||
                normalized === "nfz" ||
                normalized === "critical" ||
                normalized === "emergency"
              ? styles.alert
              : normalized === "high" ||
                  normalized === "warning" ||
                  normalized === "connecting" ||
                  normalized === "maintenance" ||
                  normalized === "charging" ||
                  normalized === "pending" ||
                  normalized === "sent" ||
                  normalized === "acknowledged" ||
                  normalized === "idle" ||
                  normalized === "contingent" ||
                  normalized === "restricted" ||
                  normalized === "paused" ||
                  normalized === "medium" ||
                  normalized === "low"
                ? styles.warning
                : normalized === "in_flight" ||
                    normalized === "executing" ||
                    normalized === "running" ||
                    normalized === "returning" ||
                    normalized === "pre_flight" ||
                    normalized === "hub_corridor" ||
                    normalized === "corridor"
                  ? styles.inFlight
                  : normalized === "scheduled" || normalized === "planned"
                    ? styles.scheduled
                    : normalized === "draft" || normalized === "dismissed"
                      ? styles.draft
                      : styles.offline;

    const isZoneStatus =
        normalized === "no_fly_zone" ||
        normalized === "nfz" ||
        normalized === "corridor" ||
        normalized === "hub_corridor" ||
        normalized === "restricted";

    const isDiamond =
        dotShape === "diamond" ||
        shape === "diamond" ||
        (dotShape !== "circle" &&
            shape !== "rounded" &&
            (shape === "chamfer" ? true : isZoneStatus));

    const displayLabel = label || String(status || "").replace(/_/g, " ");

    return (
        <span className={cn(styles.badge, variantClass, className)}>
            {showDot && (
                <span className={cn(styles.dot, isDiamond ? styles.diamond : styles.circle)} />
            )}
            <span>{displayLabel}</span>
        </span>
    );
}

export default StatusBadge;
