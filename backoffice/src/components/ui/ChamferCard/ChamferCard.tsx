"use client";

import React from "react";
import styles from "./ChamferCard.module.css";

export type ChamferSize = "sm" | "md" | "lg";
export type ChamferAccent = "cyan" | "amber" | "red" | "none";

interface ChamferCardProps {
  size?: ChamferSize;
  accent?: ChamferAccent;
  className?: string;
  innerClassName?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const SIZE_CLASSES: Record<ChamferSize, string> = {
  sm: styles.chamferSm,
  md: styles.chamferMd,
  lg: styles.chamferLg,
};

const ACCENT_CLASSES: Record<ChamferAccent, string> = {
  cyan: styles.techCyan,
  amber: styles.techAmber,
  red: styles.techRed,
  none: "",
};

export function ChamferCard({
  size = "lg",
  accent = "cyan",
  className = "",
  innerClassName = "",
  style,
  children,
}: ChamferCardProps) {
  const sizeClass = SIZE_CLASSES[size];
  const accentClass = ACCENT_CLASSES[accent];

  return (
    <div
      style={style}
      className={`${styles.wrapper} ${sizeClass} ${accentClass} ${className}`}
    >
      <div className={`${styles.inner} ${sizeClass} ${innerClassName}`}>
        {children}
      </div>
    </div>
  );
}

export default ChamferCard;
