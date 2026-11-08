"use client";

import React from "react";
import { cn } from "@/lib";

export type ChamferButtonVariant = "dark" | "active" | "danger" | "outline";
export type ChamferButtonSize = "xs" | "sm" | "md";
export type ChamferButtonClip = "xs" | "sm" | "md";

export interface ChamferButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ChamferButtonVariant;
    size?: ChamferButtonSize;
    clip?: ChamferButtonClip;
    children: React.ReactNode;
}

const CLIP_CLASSES: Record<ChamferButtonClip, string> = {
    xs: "chamfer-xs",
    sm: "chamfer-sm",
    md: "chamfer-md",
};

const SIZE_CLASSES: Record<ChamferButtonSize, string> = {
    xs: "h-7 px-2.5 text-xs gap-1",
    sm: "h-8 px-4 text-xs gap-1.5",
    md: "h-10 px-5 text-sm gap-2",
};

const SOLID_VARIANTS: Record<Exclude<ChamferButtonVariant, "outline">, string> = {
    dark: "bg-[var(--color-border-dark)] text-white hover:bg-[#1e293b]",
    active: "bg-[var(--color-status-offline)] text-white",
    danger: "bg-[var(--color-tech-red)] text-white hover:bg-[var(--color-tech-red-hover)]",
};

export function ChamferButton({
    variant = "dark",
    size = "sm",
    clip,
    className,
    disabled,
    type = "button",
    children,
    ...props
}: ChamferButtonProps) {
    const resolvedClip: ChamferButtonClip =
        clip ?? (variant === "outline" || size === "xs" ? "xs" : "sm");
    const clipClass = CLIP_CLASSES[resolvedClip];
    const sizeClass = SIZE_CLASSES[size];

    if (variant === "outline") {
        return (
            <button
                type={type}
                disabled={disabled}
                className={cn(
                    "group relative p-[1px] inline-flex items-center justify-center transition-colors cursor-pointer border-none font-bold",
                    "bg-[#cbd5e1] hover:bg-[#94a3b8]",
                    clipClass,
                    disabled && "opacity-50 cursor-not-allowed pointer-events-none",
                    className
                )}
                {...props}
            >
                <span
                    className={cn(
                        "w-full h-full inline-flex items-center justify-center bg-white group-hover:bg-[#f8fafc] group-active:bg-slate-100 text-[#334155] transition-colors pointer-events-none",
                        clipClass,
                        sizeClass
                    )}
                >
                    {children}
                </span>
            </button>
        );
    }

    return (
        <button
            type={type}
            disabled={disabled}
            className={cn(
                "inline-flex items-center justify-center transition-colors cursor-pointer border-none font-bold",
                clipClass,
                sizeClass,
                SOLID_VARIANTS[variant],
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}

export default ChamferButton;
