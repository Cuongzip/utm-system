"use client";

import { cn } from "@/lib";

export type ChamferSize = "sm" | "md" | "lg";

export interface ChamferCardProps {
    size?: ChamferSize;
    className?: string;
    innerClassName?: string;
    style?: React.CSSProperties;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
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
    onClick,
    children,
}: ChamferCardProps) {
    return (
        <div
            style={style}
            onClick={onClick}
            className={cn(
                "bg-[var(--color-border-strong)] p-[1.5px] relative drop-shadow-sm flex flex-col min-h-0",
                SIZE_CLASSES[size],
                className
            )}
        >
            <div
                className={cn(
                    "bg-[var(--color-surface-panel)] flex-1 w-full flex flex-col min-h-0",
                    SIZE_CLASSES[size],
                    innerClassName
                )}
            >
                {children}
            </div>
        </div>
    );
}
