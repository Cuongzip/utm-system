"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib";
import { Tooltip } from "./Tooltip";

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
    fixed?: boolean;
    wrapperClassName?: string;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
    ({ fixed = true, wrapperClassName, className, children, ...props }, ref) => {
        return (
            <div className={cn("w-full overflow-x-auto", wrapperClassName)}>
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
    clickable?: boolean;
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
    ({ selected = false, clickable, onClick, className, children, ...props }, ref) => {
        const isClickable = clickable ?? Boolean(onClick);

        return (
            <tr
                ref={ref}
                onClick={onClick}
                className={cn(
                    "transition-colors duration-150 hover:bg-[var(--color-surface-base)]",
                    isClickable && "cursor-pointer",
                    selected && "!bg-[var(--color-surface-card)]",
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
    width?: string | number;
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
            width,
            align = "left",
            truncate = false,
            tooltip,
            mono = false,
            bold = false,
            muted = false,
            subtle = false,
            darkText = false,
            style,
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
                        mono && "font-mono",
                        bold && "font-semibold",
                        muted && "text-[var(--color-text-secondary)] font-medium",
                        subtle && "text-[var(--color-text-muted)]",
                        darkText && "text-[var(--color-border-dark)]"
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
                style={{ width, ...style }}
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
    message?: string;
}

export function TableLoading({ colSpan = 1, message = "Loading..." }: TableLoadingProps) {
    return (
        <tr>
            <td colSpan={colSpan} className="py-16 text-center">
                <div className="flex flex-col items-center justify-center gap-2 w-full text-[var(--color-border-dark)] text-[13px] font-medium">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--color-border-dark)]" />
                    <span>{message}</span>
                </div>
            </td>
        </tr>
    );
}

export default Table;
