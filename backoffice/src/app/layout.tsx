import type { Metadata } from "next";
import { Toaster } from "@/components/ui";
import { QueryProvider } from "@/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
    title: "UTM Backoffice | Unmanned Traffic Management",
    description: "Tactical Command & Control System for Unmanned Traffic Management (UTM)",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="h-full antialiased">
            <body className="min-h-full flex flex-col">
                <QueryProvider>
                    {children}
                    <Toaster />
                </QueryProvider>
            </body>
        </html>
    );
}
