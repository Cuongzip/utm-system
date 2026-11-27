"use client";

import React, { forwardRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib";
import { Tooltip } from "./Tooltip";
import { Skeleton } from "./Skeleton";

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
    fixed?: boolean;
    wrapperClassName?: string;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
    ({ fixed = true, wrapperClassName, className, children, ...props }, ref) => {
        return (
            <div className={cn("w-full overflow-x-auto utm-scroll", wrapperClassName)}>
                <table
                    ref={ref}
                    className={cn(
                        "w-full border-collapse text-left",
                        fixed && "table-fixed",
                        className
                    )}
                    {...props}
                >
                    {children}
                </table>
            </div>
        );
    }
);
Table.displayName = "Table";

export type TableHeaderProps = React.HTMLAttributes<HTMLTableSectionElement>;

export const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <thead ref={ref} className={className} {...props}>
                {children}
            </thead>
        );
    }
);
TableHeader.displayName = "TableHeader";

export type TableBodyProps = React.HTMLAttributes<HTMLTableSectionElement>;

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <tbody ref={ref} className={className} {...props}>
                {children}
            </tbody>
        );
    }
);
TableBody.displayName = "TableBody";

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    selected?: boolean;
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
    ({ selected = false, onClick, onKeyDown, tabIndex, className, children, ...props }, ref) => {
        const isInteractive = Boolean(onClick);
        const handleKeyDown: React.KeyboardEventHandler<HTMLTableRowElement> = (e) => {
            onKeyDown?.(e);
            if (!e.defaultPrevented && onClick && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onClick(e as unknown as React.MouseEvent<HTMLTableRowElement>);
            }
        };

        return (
            <tr
                ref={ref}
                onClick={onClick}
                onKeyDown={isInteractive ? handleKeyDown : onKeyDown}
                tabIndex={isInteractive ? (tabIndex ?? 0) : tabIndex}
                aria-selected={isInteractive ? selected : undefined}
                className={cn(
                    "transition-colors duration-150 hover:bg-[var(--color-surface-base)]",
                    isInteractive &&
                        "cursor-pointer focus-visible:outline-none focus-visible:bg-slate-100",
                    selected && "!bg-slate-100/90",
                    className
                )}
                {...props}
            >
                {children}
            </tr>
        );
    }
);
TableRow.displayName = "TableRow";

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
    width?: string | number;
    align?: "left" | "center" | "right";
}

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
    ({ width, align = "left", style, className, children, ...props }, ref) => {
        const alignClass =
            align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

        return (
            <th
                ref={ref}
                style={{ width, ...style }}
                className={cn(
                    "text-[11px] font-bold text-[var(--color-status-offline-text)] uppercase tracking-wider px-[18px] py-3.5 border-b border-[var(--color-border-default)] bg-[var(--color-surface-panel)] whitespace-nowrap overflow-hidden text-ellipsis",
                    alignClass,
                    className
                )}
                {...props}
            >
                {children}
            </th>
        );
    }
);
TableHead.displayName = "TableHead";

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
    align?: "left" | "center" | "right";
    truncate?: boolean;
    tooltip?: string;
    mono?: boolean;
    bold?: boolean;
    muted?: boolean;
    subtle?: boolean;
    darkText?: boolean;
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
    (
        {
            align = "left",
            truncate = false,
            tooltip,
            mono = false,
            bold = false,
            muted = false,
            subtle = false,
            darkText = false,
            className,
            children,
            ...props
        },
        ref
    ) => {
        const alignClass =
            align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

        let content = children;

        if (truncate || mono || bold || muted || subtle || darkText) {
            content = (
                <span
                    className={cn(
                        truncate && "block max-w-full truncate",
                        mono && "font-mono tabular-nums",
                        bold && "font-semibold",
                        muted && "text-[var(--color-text-secondary)] font-medium",
                        subtle && "text-[var(--color-text-muted)]",
                        darkText && "text-[var(--color-text-primary)]"
                    )}
                >
                    {content}
                </span>
            );
        }

        if (tooltip) {
            content = (
                <Tooltip content={tooltip} side="top">
                    {content}
                </Tooltip>
            );
        }

        return (
            <td
                ref={ref}
                className={cn(
                    "px-[18px] py-3.5 text-[13px] text-[var(--color-text-primary)] border-b border-[var(--color-border-subtle)] whitespace-nowrap",
                    alignClass,
                    className
                )}
                {...props}
            >
                {content}
            </td>
        );
    }
);
TableCell.displayName = "TableCell";

export interface TableLoadingProps {
    colSpan?: number;
    rows?: number;
    message?: string;
}

const SKELETON_WIDTHS = ["w-20", "w-24", "w-16", "w-24", "w-14", "w-20", "w-16", "w-12"];

export function TableLoading({ colSpan = 1, rows = 5, message }: TableLoadingProps) {
    const t = useTranslations("common");
    const resolvedMessage = message ?? t("loading");
    const columns = Math.max(1, colSpan);
    return (
        <>
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <tr
                    key={`table-skeleton-${rowIdx}`}
                    aria-hidden={rowIdx > 0}
                    className="border-b border-[var(--color-border-subtle)] last:border-b-0"
                >
                    {Array.from({ length: columns }).map((__, colIdx) => (
                        <td key={`cell-${rowIdx}-${colIdx}`} className="px-4 py-3.5">
                            <Skeleton
                                className={cn(
                                    "h-4 max-w-full",
                                    colIdx === columns - 1 && columns > 2
                                        ? "w-10 ml-auto"
                                        : SKELETON_WIDTHS[
                                              (rowIdx + colIdx) % SKELETON_WIDTHS.length
                                          ]
                                )}
                            />
                        </td>
                    ))}
                </tr>
            ))}
            <tr className="sr-only" role="status" aria-live="polite">
                <td colSpan={columns}>{resolvedMessage}</td>
            </tr>
        </>
    );
}
