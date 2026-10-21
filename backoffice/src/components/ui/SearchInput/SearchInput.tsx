"use client";

import React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  wrapperClassName?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
  wrapperClassName,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative flex items-center", wrapperClassName)}>
      <Search className="absolute left-3 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "pl-9 pr-3 py-1.5 text-xs rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-panel)] text-[var(--color-text-primary)] outline-none min-w-[220px] transition-all focus:border-[var(--color-border-dark)] focus:ring-1 focus:ring-[var(--color-border-dark)] placeholder:text-[var(--color-text-muted)]",
          className
        )}
        {...props}
      />
    </div>
  );
}

export default SearchInput;
