"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib";
import { Tooltip } from "../Tooltip";
import styles from "./Table.module.css";

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
    fixed?: boolean;
    wrapperClassName?: string;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
    ({ fixed = true, wrapperClassName, className, children, ...props }, ref) => {
        return (
            <div className={cn(styles.tableWrapper, wrapperClassName)}>
                <table
                    ref={ref}
                    className={cn(styles.table, fixed && styles.fixed, className)}
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
                    styles.row,
                    isClickable && styles.clickable,
                    selected && styles.selectedRow,
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
            align === "right"
                ? styles.alignRight
                : align === "center"
                  ? styles.alignCenter
                  : styles.alignLeft;

        return (
            <th
                ref={ref}
                style={{ width, ...style }}
                className={cn(styles.th, alignClass, className)}
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
            align === "right"
                ? styles.alignRight
                : align === "center"
                  ? styles.alignCenter
                  : styles.alignLeft;

        let content = children;

        if (truncate || mono || bold || muted || subtle || darkText) {
            content = (
                <span
                    className={cn(
                        truncate && styles.truncate,
                        mono && styles.mono,
                        bold && styles.bold,
                        muted && styles.muted,
                        subtle && styles.subtle,
                        darkText && styles.darkText
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
                className={cn(styles.td, alignClass, className)}
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
