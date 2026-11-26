"use client";

import React, { useId, useMemo, useRef, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib";

export interface SelectOption {
    value: string;
    label: string;
    description?: string;
}

export interface CustomSelectProps {
    id?: string;
    value: string;
    onValueChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    error?: boolean;
    ariaLabel?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
}

export function CustomSelect({
    id,
    value,
    onValueChange,
    options,
    placeholder = "Select an option…",
    disabled = false,
    className,
    error = false,
    ariaLabel,
    searchable,
    searchPlaceholder = "Type to filter…",
}: CustomSelectProps) {
    const listboxId = useId();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const isSearchable = searchable ?? options.length > 5;

    const selectedOption = useMemo(
        () => options.find((opt) => opt.value === value) ?? null,
        [options, value]
    );

    const filteredOptions = useMemo(() => {
        const trimmed = query.trim().toLowerCase();
        if (!trimmed) return options;
        return options.filter(
            (opt) =>
                opt.label.toLowerCase().includes(trimmed) ||
                (opt.description && opt.description.toLowerCase().includes(trimmed)) ||
                opt.value.toLowerCase().includes(trimmed)
        );
    }, [options, query]);

    const safeHighlightIndex =
        filteredOptions.length === 0
            ? -1
            : Math.min(Math.max(0, highlightedIndex), filteredOptions.length - 1);

    const handleOpenChange = (nextOpen: boolean) => {
        if (disabled) return;
        if (nextOpen) {
            setPortalContainer(
                (triggerRef.current?.closest('[role="dialog"]') as HTMLElement | null) ?? null
            );
            setQuery("");
            const selectedIdx = options.findIndex((o) => o.value === value);
            setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
        }
        setOpen(nextOpen);
    };

    const handleSelect = (val: string) => {
        onValueChange(val);
        setOpen(false);
        setQuery("");
    };

    const scrollItemIntoView = (idx: number) => {
        const container = listRef.current;
        if (!container) return;
        const itemEl = container.querySelector<HTMLElement>(`[data-opt-index="${idx}"]`);
        itemEl?.scrollIntoView({ block: "nearest" });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (filteredOptions.length === 0) return;
            const next = (safeHighlightIndex + 1) % filteredOptions.length;
            setHighlightedIndex(next);
            scrollItemIntoView(next);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (filteredOptions.length === 0) return;
            const prev = (safeHighlightIndex - 1 + filteredOptions.length) % filteredOptions.length;
            setHighlightedIndex(prev);
            scrollItemIntoView(prev);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (safeHighlightIndex >= 0 && filteredOptions[safeHighlightIndex]) {
                handleSelect(filteredOptions[safeHighlightIndex].value);
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
        }
    };

    return (
        <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
            <PopoverPrimitive.Trigger asChild>
                <button
                    ref={triggerRef}
                    id={id}
                    type="button"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listboxId}
                    aria-label={ariaLabel}
                    disabled={disabled}
                    title={selectedOption?.label || undefined}
                    className={cn(
                        "flex h-[38px] w-full min-w-0 max-w-full overflow-hidden items-center justify-between gap-2 rounded-[6px] border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800 shadow-2xs transition-colors hover:border-slate-400 focus-visible:border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
                        error &&
                            "border-red-400 bg-red-50 text-red-900 focus-visible:border-red-500",
                        className
                    )}
                >
                    <span
                        className={cn(
                            "truncate min-w-0 flex-1 text-left",
                            !selectedOption && "text-slate-400"
                        )}
                    >
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown
                        className={cn(
                            "h-3.5 w-3.5 shrink-0 text-slate-500 opacity-80 transition-transform duration-150",
                            open && "rotate-180"
                        )}
                        aria-hidden="true"
                    />
                </button>
            </PopoverPrimitive.Trigger>

            <PopoverPrimitive.Portal container={portalContainer ?? undefined}>
                <PopoverPrimitive.Content
                    align="start"
                    sideOffset={4}
                    collisionPadding={12}
                    onOpenAutoFocus={(e) => {
                        if (isSearchable) {
                            e.preventDefault();
                            requestAnimationFrame(() => inputRef.current?.focus());
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    className="z-[9999] min-w-[var(--radix-popover-trigger-width)] w-max max-w-[max(var(--radix-popover-trigger-width),min(380px,calc(100vw-1.5rem)))] overflow-hidden rounded-[6px] border border-slate-200 bg-white text-slate-800 shadow-xl flex flex-col focus:outline-none"
                >
                    {isSearchable && (
                        <div className="px-2.5 py-2 border-b border-slate-100 flex items-center gap-2 shrink-0 bg-slate-50/60">
                            <Search
                                className="w-3.5 h-3.5 text-slate-400 shrink-0"
                                aria-hidden="true"
                            />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setHighlightedIndex(0);
                                }}
                                placeholder={searchPlaceholder}
                                aria-label="Filter options"
                                className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQuery("");
                                        setHighlightedIndex(0);
                                        inputRef.current?.focus();
                                    }}
                                    aria-label="Clear filter"
                                    className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}

                    <div
                        id={listboxId}
                        ref={listRef}
                        role="listbox"
                        className="max-h-60 overflow-y-auto overscroll-contain p-1"
                    >
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-4 text-center text-xs font-mono text-slate-400">
                                No matching options
                            </div>
                        ) : (
                            filteredOptions.map((opt, idx) => {
                                const isSelected = opt.value === value;
                                const isHighlighted = idx === safeHighlightIndex;
                                return (
                                    <button
                                        key={`${opt.value || "__empty__"}-${idx}`}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        data-opt-index={idx}
                                        onMouseEnter={() => setHighlightedIndex(idx)}
                                        onClick={() => handleSelect(opt.value)}
                                        className={cn(
                                            "relative flex w-full cursor-pointer select-none items-center rounded-[4px] py-2 pl-7 pr-3 text-left text-[13px] outline-none transition-colors",
                                            isHighlighted
                                                ? "bg-slate-100 text-slate-900"
                                                : "text-slate-700 hover:bg-slate-100",
                                            isSelected && "font-semibold text-slate-900"
                                        )}
                                    >
                                        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                            {isSelected && (
                                                <Check className="h-3.5 w-3.5 text-slate-800" />
                                            )}
                                        </span>
                                        <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
                                            <span className="truncate" title={opt.label}>
                                                {opt.label}
                                            </span>
                                            {opt.description && (
                                                <span className="text-[11px] text-slate-400 shrink-0">
                                                    {opt.description}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
    );
}
