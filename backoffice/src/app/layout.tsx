import type { Metadata } from "next";
import { Toaster } from "@/components/ui";
import { QueryProvider } from "@/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
    title: "UTM Backoffice - Hệ Thống Giám Sát Bản Đồ Không Gian",
    description: "Hệ thống điều hành không gian bay không người lái UTM",
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
                    <Toaster position="top-right" />
                </QueryProvider>
            </body>
        </html>
    );
}
