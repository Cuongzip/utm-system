"use client";

import { useLocale } from "next-intl";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib";
import { getDateFnsLocale, type AppLocale } from "@/i18n";

type CalendarProps = DayPickerProps;

export function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    const locale = useLocale() as AppLocale;

    return (
        <div className={cn("utm-calendar p-2 bg-white rounded-md select-none", className)}>
            <DayPicker
                locale={getDateFnsLocale(locale)}
                showOutsideDays={showOutsideDays}
                className="rdp-root text-xs"
                classNames={classNames}
                {...props}
            />
        </div>
    );
}

Calendar.displayName = "Calendar";
