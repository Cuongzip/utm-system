"use client";

import React, { useState, useRef, useEffect } from "react";
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
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleOutsideClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen((prev) => !prev);
                }}
                className={cn(
                    "w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 inline-flex items-center justify-center cursor-pointer transition-colors shadow-2xs",
                    buttonClassName
                )}
                aria-label="Actions"
            >
                <MoreHorizontal className="w-4 h-4" />
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 top-full mt-1 w-32 rounded-md bg-white border border-slate-200 shadow-md py-1 z-40 flex flex-col gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                >
                    {items.map((item, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                item.onClick();
                            }}
                            className={cn(
                                "w-full text-left px-3 py-1.5 text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors bg-transparent border-none",
                                item.danger
                                    ? "text-red-600 hover:bg-red-50"
                                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                            )}
                        >
                            {item.icon && (
                                <span className="w-3.5 h-3.5 flex items-center justify-center text-current">
                                    {item.icon}
                                </span>
                            )}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ActionMenu;
