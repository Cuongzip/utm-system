"use client";

import { AlertBanner } from "@/components/ui";

interface ConnectivityAlertProps {
    message?: string;
    onDismiss?: () => void;
}

export function ConnectivityAlert({
    message = "Failed to fetch devices",
    onDismiss,
}: ConnectivityAlertProps) {
    return <AlertBanner message={message} onDismiss={onDismiss} />;
}

export default ConnectivityAlert;
