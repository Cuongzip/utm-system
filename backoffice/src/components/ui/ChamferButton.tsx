"use client";

import React from "react";
import { cn } from "@/lib";

export type ChamferButtonVariant = "dark" | "active" | "danger";
export type ChamferButtonSize = "sm" | "md";

interface ChamferButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ChamferButtonVariant;
    size?: ChamferButtonSize;
    children: React.ReactNode;
}

const SIZE_CLASSES: Record<ChamferButtonSize, string> = {
    sm: "chamfer-sm h-8 px-4 text-xs",
    md: "chamfer-md h-10 px-5 text-sm",
};

const VARIANT_CLASSES: Record<ChamferButtonVariant, string> = {
    dark: "bg-[var(--color-border-dark)] text-white hover:bg-[#1e293b]",
    active: "bg-[var(--color-status-offline)] text-white",
    danger: "bg-[var(--color-tech-red)] text-white hover:bg-[var(--color-tech-red-hover)]",
};

export function ChamferButton({
    variant = "dark",
    size = "sm",
    className,
    children,
    ...props
}: ChamferButtonProps) {
    return (
        <button
            className={cn(
                "inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none font-bold",
                SIZE_CLASSES[size],
                VARIANT_CLASSES[variant],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}

export default ChamferButton;
