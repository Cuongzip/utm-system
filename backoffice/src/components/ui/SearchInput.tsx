"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { cn } from "@/lib";

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export function SearchInput({
    value,
    onChange,
    placeholder,
    className,
    "aria-label": ariaLabel,
    ...props
}: SearchInputProps) {
    const t = useTranslations("common");
    const resolvedPlaceholder = placeholder ?? t("search");

    return (
        <div className="relative flex items-center w-full sm:w-auto">
            <Search
                className="absolute left-3 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none"
                aria-hidden="true"
            />
            <input
                type="search"
                placeholder={resolvedPlaceholder}
                aria-label={ariaLabel || resolvedPlaceholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    "w-full pl-9 py-1.5 text-xs rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-panel)] text-[var(--color-text-primary)] outline-none transition-all focus-visible:border-[var(--color-border-dark)] focus-visible:ring-2 focus-visible:ring-slate-300 placeholder:text-[var(--color-text-muted)] [&::-webkit-search-cancel-button]:hidden",
                    value ? "pr-8" : "pr-3",
                    className
                )}
                {...props}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange("")}
                    aria-label={t("clearSearch")}
                    className="absolute right-2 p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors cursor-pointer"
                >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
