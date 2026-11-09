"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib";

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
    label?: React.ReactNode;
}

const CHAMFER_TRACK_CLIP =
    "polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)";

const CHAMFER_THUMB_CLIP =
    "polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)";

export const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>, SwitchProps>(
    ({ className, label, id, disabled, ...props }, ref) => {
        const generatedId = React.useId();
        const switchId = id || generatedId;

        const switchElement = (
            <SwitchPrimitives.Root
                id={switchId}
                ref={ref}
                disabled={disabled}
                className={cn(
                    "peer inline-flex h-[20px] w-[38px] shrink-0 cursor-pointer items-center p-[2px] transition-colors",
                    "bg-[#1e293b] border border-[#334155] hover:border-slate-500",
                    "data-[state=checked]:bg-slate-900 data-[state=unchecked]:bg-slate-800/90",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                style={{ clipPath: CHAMFER_TRACK_CLIP }}
                {...props}
            >
                <SwitchPrimitives.Thumb
                    className={cn(
                        "pointer-events-none block h-[14px] w-[14px] shadow-xs transition-all duration-200 ease-in-out",
                        "data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-white",
                        "data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-slate-400"
                    )}
                    style={{ clipPath: CHAMFER_THUMB_CLIP }}
                />
            </SwitchPrimitives.Root>
        );

        if (!label) {
            return switchElement;
        }

        return (
            <label
                htmlFor={switchId}
                className={cn(
                    "inline-flex items-center gap-2 cursor-pointer select-none",
                    disabled && "cursor-not-allowed opacity-50"
                )}
            >
                <span className="font-mono text-[11px] font-bold tracking-wider text-[var(--color-text-primary)] uppercase select-none">
                    {label}
                </span>
                {switchElement}
            </label>
        );
    }
);

Switch.displayName = "Switch";
