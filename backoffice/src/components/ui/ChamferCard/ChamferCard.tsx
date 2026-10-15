"use client";

import { cn } from "@/lib";
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
  className,
  innerClassName,
  style,
  children,
}: ChamferCardProps) {
  return (
    <div
      style={style}
      className={cn(styles.wrapper, SIZE_CLASSES[size], ACCENT_CLASSES[accent], className)}
    >
      <div className={cn(styles.inner, SIZE_CLASSES[size], innerClassName)}>
        {children}
      </div>
    </div>
  );
}

export default ChamferCard;
