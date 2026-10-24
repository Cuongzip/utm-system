"use client";

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib";

export type CalendarProps = DayPickerProps;

export function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <div className={cn("utm-calendar p-2 bg-white rounded-md select-none", className)}>
            <DayPicker
                showOutsideDays={showOutsideDays}
                className="rdp-root text-xs"
                classNames={classNames}
                {...props}
            />
        </div>
    );
}

Calendar.displayName = "Calendar";

export default Calendar;
