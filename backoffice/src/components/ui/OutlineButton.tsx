"use client";

import React from "react";
import { cn } from "@/lib";

export type OutlineButtonSize = "sm" | "md";

export interface OutlineButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    size?: OutlineButtonSize;
    children: React.ReactNode;
}

export function OutlineButton({
    size = "sm",
    className,
    children,
    type = "button",
    ...props
}: OutlineButtonProps) {
    return (
        <button
            type={type}
            className={cn(
                "bg-white border border-[#cbd5e1] rounded-[6px] flex items-center justify-center font-bold text-[#334155] hover:bg-[#f8fafc] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                size === "sm"
                    ? "h-8 px-[15px] text-[12px] gap-[6px]"
                    : "h-10 px-[20px] text-[14px] gap-[8px]",
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}

export default OutlineButton;
