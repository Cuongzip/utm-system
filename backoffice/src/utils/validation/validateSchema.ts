import { humanizeValidationMessage } from "./humanizeValidationMessage";

type ValidationResult<T = unknown> =
    { success: true; data: T } | { success: false; errors: Record<string, string> };

interface SafeParseIssue {
    path: PropertyKey[];
    message: string;
}

interface SafeParseSchema {
    safeParse: (data: unknown) => {
        success: boolean;
        data?: unknown;
        error?: { issues?: SafeParseIssue[] };
    };
}

export function validateSchema<T = unknown>(
    schema: SafeParseSchema,
    data: unknown
): ValidationResult<T> {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data as T };
    }

    const errors: Record<string, string> = {};
    if (result.error?.issues) {
        for (const issue of result.error.issues) {
            const path = issue.path.map(String).join(".");
            if (path && !errors[path]) {
                errors[path] = humanizeValidationMessage(issue.message);
            }
        }
    }

    return { success: false, errors };
}
