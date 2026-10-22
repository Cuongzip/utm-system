"use client";

import React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib";

export interface ActionMenuItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
}

interface ActionMenuProps {
    items: ActionMenuItem[];
    className?: string;
    buttonClassName?: string;
}

export function ActionMenu({ items, className, buttonClassName }: ActionMenuProps) {
    return (
        <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
                <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                        "w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 inline-flex items-center justify-center cursor-pointer transition-colors shadow-2xs focus:outline-none",
                        buttonClassName
                    )}
                    aria-label="Actions"
                >
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </DropdownMenuPrimitive.Trigger>

            <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content
                    align="end"
                    sideOffset={4}
                    collisionPadding={8}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                        "z-[9999] min-w-[8.5rem] overflow-hidden rounded-md border border-slate-200 bg-white p-1 text-slate-700 shadow-md",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
                        className
                    )}
                >
                    {items.map((item, index) => (
                        <DropdownMenuPrimitive.Item
                            key={index}
                            onClick={(e) => {
                                e.stopPropagation();
                                item.onClick();
                            }}
                            className={cn(
                                "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium outline-none transition-colors",
                                item.danger
                                    ? "text-red-600 focus:bg-red-50 focus:text-red-700 hover:bg-red-50 hover:text-red-700"
                                    : "text-slate-700 focus:bg-slate-100 focus:text-slate-900 hover:bg-slate-100 hover:text-slate-900"
                            )}
                        >
                            {item.icon && (
                                <span className="w-3.5 h-3.5 flex items-center justify-center text-current">
                                    {item.icon}
                                </span>
                            )}
                            <span>{item.label}</span>
                        </DropdownMenuPrimitive.Item>
                    ))}
                </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
    );
}

export default ActionMenu;
