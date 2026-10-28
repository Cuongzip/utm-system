"use client";

import React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib";

export interface SelectOption {
    value: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
}

export interface CustomSelectProps {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    error?: boolean;
}

const EMPTY_VALUE = "__EMPTY_VALUE__";

export function CustomSelect({
    value,
    defaultValue,
    onValueChange,
    options,
    placeholder = "Select an option...",
    disabled = false,
    className,
    error = false,
}: CustomSelectProps) {
    const internalValue = value === "" ? EMPTY_VALUE : value;
    const internalDefaultValue = defaultValue === "" ? EMPTY_VALUE : defaultValue;

    const handleValueChange = (val: string) => {
        onValueChange?.(val === EMPTY_VALUE ? "" : val);
    };

    return (
        <SelectPrimitive.Root
            value={internalValue}
            defaultValue={internalDefaultValue}
            onValueChange={handleValueChange}
            disabled={disabled}
        >
            <SelectPrimitive.Trigger
                className={cn(
                    "flex h-[38px] w-full items-center justify-between rounded-[6px] border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800 shadow-2xs transition-colors hover:border-slate-400 focus:border-slate-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
                    error && "border-red-400 bg-red-50 text-red-900 focus:border-red-500",
                    className
                )}
            >
                <SelectPrimitive.Value placeholder={placeholder} />
                <SelectPrimitive.Icon asChild>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500 opacity-80" />
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>

            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    position="popper"
                    sideOffset={4}
                    className="z-[9999] max-h-60 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[6px] border border-slate-200 bg-white text-slate-800 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
                >
                    <SelectPrimitive.Viewport className="p-1">
                        {options.map((opt) => {
                            const itemVal = opt.value === "" ? EMPTY_VALUE : opt.value;
                            return (
                                <SelectPrimitive.Item
                                    key={itemVal}
                                    value={itemVal}
                                    className="relative flex w-full cursor-pointer select-none items-center rounded-[4px] py-2 pl-7 pr-3 text-[13px] outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                >
                                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                        <SelectPrimitive.ItemIndicator>
                                            <Check className="h-3.5 w-3.5 text-slate-800" />
                                        </SelectPrimitive.ItemIndicator>
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                                        <SelectPrimitive.ItemText>
                                            {opt.label}
                                        </SelectPrimitive.ItemText>
                                        {opt.description && (
                                            <span className="text-[11px] text-slate-400">
                                                {opt.description}
                                            </span>
                                        )}
                                    </div>
                                </SelectPrimitive.Item>
                            );
                        })}
                    </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    );
}

export default CustomSelect;
