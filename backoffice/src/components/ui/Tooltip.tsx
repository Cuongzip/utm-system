"use client";

import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib";

export interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    side?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
    delayDuration?: number;
    className?: string;
    asChild?: boolean;
}

export function Tooltip({
    content,
    children,
    side = "top",
    align = "center",
    delayDuration = 200,
    className,
    asChild = true,
}: TooltipProps) {
    if (!content) return <>{children}</>;

    return (
        <TooltipPrimitive.Provider delayDuration={delayDuration}>
            <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild={asChild}>{children}</TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        side={side}
                        align={align}
                        sideOffset={6}
                        className={cn(
                            "z-[9999] overflow-hidden rounded bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-100 shadow-md",
                            "data-[state=delayed-open]:data-[side=top]:animate-in data-[state=delayed-open]:data-[side=top]:fade-in-0 data-[state=delayed-open]:data-[side=top]:zoom-in-95",
                            "data-[state=delayed-open]:data-[side=bottom]:animate-in data-[state=delayed-open]:data-[side=bottom]:fade-in-0 data-[state=delayed-open]:data-[side=bottom]:zoom-in-95",
                            className
                        )}
                    >
                        {content}
                        <TooltipPrimitive.Arrow className="fill-slate-900" width={8} height={4} />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
}

export default Tooltip;
