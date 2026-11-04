"use client";

import { cn } from "@/lib";

export type ChamferSize = "sm" | "md" | "lg";

interface ChamferCardProps {
    size?: ChamferSize;
    className?: string;
    innerClassName?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
}

const SIZE_CLASSES: Record<ChamferSize, string> = {
    sm: "chamfer-sm",
    md: "chamfer-md",
    lg: "chamfer-lg",
};

export function ChamferCard({
    size = "lg",
    className,
    innerClassName,
    style,
    children,
}: ChamferCardProps) {
    return (
        <div
            style={style}
            className={cn(
                "bg-[var(--color-border-strong)] p-[1.5px] relative drop-shadow-sm",
                SIZE_CLASSES[size],
                className
            )}
        >
            <div
                className={cn(
                    "bg-[var(--color-surface-panel)] h-full",
                    SIZE_CLASSES[size],
                    innerClassName
                )}
            >
                {children}
            </div>
        </div>
    );
}

export default ChamferCard;
