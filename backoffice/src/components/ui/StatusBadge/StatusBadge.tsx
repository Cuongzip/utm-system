"use client";

import React from "react";
import { cn } from "@/lib";
import styles from "./StatusBadge.module.css";

export type StatusType = "online" | "offline" | "connecting" | "alert" | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  className,
}: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const variantClass =
    normalized === "online" || normalized === "live"
      ? styles.online
      : normalized === "offline"
      ? styles.offline
      : normalized === "connecting"
      ? styles.connecting
      : normalized === "alert" || normalized === "error"
      ? styles.alert
      : styles.offline;

  const displayLabel = label || status;

  return (
    <span className={cn(styles.badge, variantClass, className)}>
      <span className={styles.dot} />
      <span>{displayLabel}</span>
    </span>
  );
}

export default StatusBadge;
