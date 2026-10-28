"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format, isValid } from "date-fns";
import { Calendar as CalendarIcon, Clock, X, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import { Calendar } from "./Calendar";
import { cn } from "@/lib";

export interface DateTimePickerProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: boolean;
    className?: string;
    minDate?: Date;
    maxDate?: Date;
}

export function DateTimePicker({
    value,
    onChange,
    placeholder = "Select date & time...",
    disabled = false,
    error = false,
    className,
    minDate,
}: DateTimePickerProps) {
    const [open, setOpen] = useState(false);

    const parsedDate = useMemo(() => {
        if (!value) return null;
        const d = new Date(value);
        return isValid(d) ? d : null;
    }, [value]);

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(parsedDate || undefined);
    const [hours, setHours] = useState<string>(
        parsedDate ? String(parsedDate.getHours()).padStart(2, "0") : "09"
    );
    const [minutes, setMinutes] = useState<string>(
        parsedDate ? String(parsedDate.getMinutes()).padStart(2, "0") : "00"
    );

    useEffect(() => {
        if (parsedDate) {
            setSelectedDate(parsedDate);
            setHours(String(parsedDate.getHours()).padStart(2, "0"));
            setMinutes(String(parsedDate.getMinutes()).padStart(2, "0"));
        } else if (!value) {
            setSelectedDate(undefined);
        }
    }, [parsedDate, value]);

    const handleApply = (newDate?: Date, newH?: string, newM?: string) => {
        const d = newDate || selectedDate || new Date();
        const h = parseInt(newH !== undefined ? newH : hours, 10) || 0;
        const m = parseInt(newM !== undefined ? newM : minutes, 10) || 0;

        const updated = new Date(d);
        updated.setHours(h);
        updated.setMinutes(m);
        updated.setSeconds(0);
        updated.setMilliseconds(0);

        const year = updated.getFullYear();
        const month = String(updated.getMonth() + 1).padStart(2, "0");
        const day = String(updated.getDate()).padStart(2, "0");
        const hh = String(updated.getHours()).padStart(2, "0");
        const mm = String(updated.getMinutes()).padStart(2, "0");

        const formatted = `${year}-${month}-${day}T${hh}:${mm}`;
        onChange?.(formatted);
    };

    const handleDaySelect = (day: Date | undefined) => {
        setSelectedDate(day);
        if (day) {
            handleApply(day, hours, minutes);
        }
    };

    const handleHourChange = (newH: string) => {
        setHours(newH);
        if (selectedDate) {
            handleApply(selectedDate, newH, minutes);
        }
    };

    const handleMinuteChange = (newM: string) => {
        setMinutes(newM);
        if (selectedDate) {
            handleApply(selectedDate, hours, newM);
        }
    };

    const handleSetNow = () => {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, "0");
        const m = String(now.getMinutes()).padStart(2, "0");
        setSelectedDate(now);
        setHours(h);
        setMinutes(m);
        handleApply(now, h, m);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedDate(undefined);
        onChange?.("");
    };

    const displayText = parsedDate ? format(parsedDate, "MMM dd, yyyy · HH:mm") : "";

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        "flex h-[38px] w-full items-center justify-between rounded-[6px] border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800 shadow-2xs transition-colors hover:border-slate-400 focus:border-slate-700 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer text-left font-mono",
                        error && "border-red-400 bg-red-50 text-red-900 focus:border-red-500",
                        !displayText && "text-slate-400 font-sans",
                        className
                    )}
                >
                    <div className="flex items-center gap-2 overflow-hidden truncate">
                        <CalendarIcon className="h-4 w-4 shrink-0 text-slate-500" />
                        <span className="truncate">{displayText || placeholder}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {displayText && !disabled && (
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={handleClear}
                                className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                                title="Clear date"
                            >
                                <X className="h-3.5 w-3.5" />
                            </span>
                        )}
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                </button>
            </PopoverTrigger>

            <PopoverContent
                className="p-3 w-auto bg-white border border-slate-200 shadow-xl rounded-lg z-[9999]"
                align="start"
            >
                <div className="space-y-3">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDaySelect}
                        disabled={minDate ? (d) => d < minDate : undefined}
                    />

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-1.5 font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <select
                                value={hours}
                                onChange={(e) => handleHourChange(e.target.value)}
                                className="h-7 px-1.5 border border-slate-200 rounded text-xs bg-slate-50 text-slate-800 font-mono focus:border-slate-700 focus:outline-hidden cursor-pointer"
                            >
                                {Array.from({ length: 24 }).map((_, i) => {
                                    const hStr = String(i).padStart(2, "0");
                                    return (
                                        <option key={hStr} value={hStr}>
                                            {hStr}
                                        </option>
                                    );
                                })}
                            </select>
                            <span className="text-slate-400 font-bold">:</span>
                            <select
                                value={minutes}
                                onChange={(e) => handleMinuteChange(e.target.value)}
                                className="h-7 px-1.5 border border-slate-200 rounded text-xs bg-slate-50 text-slate-800 font-mono focus:border-slate-700 focus:outline-hidden cursor-pointer"
                            >
                                {Array.from({ length: 12 }).map((_, i) => {
                                    const mStr = String(i * 5).padStart(2, "0");
                                    return (
                                        <option key={mStr} value={mStr}>
                                            {mStr}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handleSetNow}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer transition-colors"
                            >
                                Now
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[var(--color-border-dark)] hover:bg-slate-800 rounded cursor-pointer transition-colors flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" />
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export default DateTimePicker;
