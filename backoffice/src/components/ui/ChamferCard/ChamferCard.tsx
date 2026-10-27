"use client";

import { cn } from "@/lib";
import styles from "./ChamferCard.module.css";

export type ChamferSize = "sm" | "md" | "lg";

interface ChamferCardProps {
    size?: ChamferSize;
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

export function ChamferCard({
    size = "lg",
    className,
    innerClassName,
    style,
    children,
}: ChamferCardProps) {
    return (
        <div style={style} className={cn(styles.wrapper, SIZE_CLASSES[size], className)}>
            <div className={cn(styles.inner, SIZE_CLASSES[size], innerClassName)}>{children}</div>
        </div>
    );
}

export default ChamferCard;
