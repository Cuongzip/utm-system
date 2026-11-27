"use client";

import React, { useEffect, useRef } from "react";
import { NextIntlClientProvider } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { MESSAGES, useAppLocale } from "@/i18n";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
    const locale = useAppLocale();
    const queryClient = useQueryClient();
    const prevLocaleRef = useRef(locale);

    useEffect(() => {
        document.documentElement.lang = locale;
        if (prevLocaleRef.current !== locale) {
            prevLocaleRef.current = locale;
            queryClient.invalidateQueries();
        }
    }, [locale, queryClient]);

    return (
        <NextIntlClientProvider
            locale={locale}
            messages={MESSAGES[locale]}
            timeZone="Asia/Ho_Chi_Minh"
        >
            {children}
        </NextIntlClientProvider>
    );
}
