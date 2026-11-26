"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib";

export type ChamferButtonVariant = "dark" | "outline";
export type ChamferButtonSize = "xs" | "sm" | "md";
export type ChamferButtonClip = "xs" | "sm";

export interface ChamferButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ChamferButtonVariant;
    size?: ChamferButtonSize;
    clip?: ChamferButtonClip;
    href?: string;
    external?: boolean;
    nativeAnchor?: boolean;
    children: React.ReactNode;
}

const CLIP_CLASSES: Record<ChamferButtonClip, string> = {
    xs: "chamfer-xs",
    sm: "chamfer-sm",
};

const SIZE_CLASSES: Record<ChamferButtonSize, string> = {
    xs: "h-7 px-2.5 text-xs gap-1",
    sm: "h-8 px-4 text-xs gap-1.5",
    md: "h-10 px-5 text-sm gap-2",
};

const SOLID_VARIANTS: Record<Exclude<ChamferButtonVariant, "outline">, string> = {
    dark: "bg-[var(--color-border-dark)] text-white hover:bg-[#1e293b]",
};

export function ChamferButton({
    variant = "dark",
    size = "sm",
    clip,
    href,
    external = false,
    nativeAnchor = false,
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
        const outlineWrapperClass = cn(
            "group relative p-[1px] inline-flex items-center justify-center transition-colors cursor-pointer border-none font-bold no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1",
            "bg-[#cbd5e1] hover:bg-[#94a3b8]",
            clipClass,
            disabled && "opacity-50 cursor-not-allowed pointer-events-none",
            className
        );
        const outlineInner = (
            <span
                className={cn(
                    "w-full h-full inline-flex items-center justify-center bg-white group-hover:bg-[#f8fafc] group-active:bg-slate-100 text-[#334155] transition-colors pointer-events-none",
                    clipClass,
                    sizeClass
                )}
            >
                {children}
            </span>
        );

        if (href && !disabled) {
            if (external) {
                return (
                    <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={props["aria-label"]}
                        title={props.title}
                        className={outlineWrapperClass}
                    >
                        {outlineInner}
                    </a>
                );
            }
            if (nativeAnchor) {
                return (
                    <a
                        href={href}
                        aria-label={props["aria-label"]}
                        title={props.title}
                        className={outlineWrapperClass}
                    >
                        {outlineInner}
                    </a>
                );
            }
            return (
                <Link
                    href={href}
                    aria-label={props["aria-label"]}
                    title={props.title}
                    className={outlineWrapperClass}
                >
                    {outlineInner}
                </Link>
            );
        }

        return (
            <button type={type} disabled={disabled} className={outlineWrapperClass} {...props}>
                {outlineInner}
            </button>
        );
    }

    const solidClass = cn(
        "inline-flex items-center justify-center transition-colors cursor-pointer border-none font-bold no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1",
        clipClass,
        sizeClass,
        SOLID_VARIANTS[variant],
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
    );

    if (href && !disabled) {
        if (external) {
            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={props["aria-label"]}
                    title={props.title}
                    className={solidClass}
                >
                    {children}
                </a>
            );
        }
        if (nativeAnchor) {
            return (
                <a
                    href={href}
                    aria-label={props["aria-label"]}
                    title={props.title}
                    className={solidClass}
                >
                    {children}
                </a>
            );
        }
        return (
            <Link
                href={href}
                aria-label={props["aria-label"]}
                title={props.title}
                className={solidClass}
            >
                {children}
            </Link>
        );
    }

    return (
        <button type={type} disabled={disabled} className={solidClass} {...props}>
            {children}
        </button>
    );
}
