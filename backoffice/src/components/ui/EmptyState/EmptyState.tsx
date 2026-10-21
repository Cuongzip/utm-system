"use client";

import React from "react";
import { cn } from "@/lib";
import { ChamferButton } from "../ChamferButton";

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center w-full select-none",
        compact ? "py-4 px-2" : "py-10 px-4",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "rounded-full bg-[var(--color-surface-base)] border border-[var(--color-border-default)] flex items-center justify-center text-[var(--color-text-muted)]",
            compact ? "w-8 h-8 mb-2" : "w-12 h-12 mb-3"
          )}
        >
          <Icon className={compact ? "w-4 h-4" : "w-6 h-6"} />
        </div>
      )}
      <h3
        className={cn(
          "font-semibold text-[var(--color-text-primary)]",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "text-[var(--color-text-muted)] mt-1 max-w-sm",
            compact ? "text-[11px]" : "text-xs"
          )}
        >
          {description}
        </p>
      )}
      {action && (
        <ChamferButton
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </ChamferButton>
      )}
      {children}
    </div>
  );
}

export default EmptyState;
