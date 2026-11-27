import zod from "zod";
import { getCurrentLocale, MESSAGES } from "@/i18n";

let zodConfigured = false;

function getValidationDict() {
    return MESSAGES[getCurrentLocale()].validation;
}

export function humanizeValidationMessage(rawMessage: string): string {
    const v = getValidationDict();
    const trimmed = rawMessage.trim();
    if (!trimmed) return v.invalidValue;

    if (/^Too small:\s*expected string to have >=1 characters$/i.test(trimmed)) {
        return v.required;
    }

    const minStrMatch = trimmed.match(/^Too small:\s*expected string to have >=(\d+) characters$/i);
    if (minStrMatch) {
        return v.minChars.replace("{min}", minStrMatch[1]);
    }

    const maxStrMatch = trimmed.match(/^Too big:\s*expected string to have <=(\d+) characters$/i);
    if (maxStrMatch) {
        return v.maxChars.replace("{max}", maxStrMatch[1]);
    }

    const minArrMatch = trimmed.match(/^Too small:\s*expected array to have >=(\d+) items$/i);
    if (minArrMatch) {
        return Number(minArrMatch[1]) === 1
            ? v.minItemsOne
            : v.minItems.replace("{min}", minArrMatch[1]);
    }

    const minNumMatch = trimmed.match(/^Too small:\s*expected (?:number|int) to be >=(.+)$/i);
    if (minNumMatch) {
        return v.minNumber.replace("{min}", minNumMatch[1]);
    }

    const maxNumMatch = trimmed.match(/^Too big:\s*expected (?:number|int) to be <=(.+)$/i);
    if (maxNumMatch) {
        return v.maxNumber.replace("{max}", maxNumMatch[1]);
    }

    if (/^Invalid UUID$/i.test(trimmed) || /^Invalid input:\s*expected uuid/i.test(trimmed)) {
        return v.selectValidOption;
    }

    if (/^Invalid option:/i.test(trimmed) || /^Invalid enum value/i.test(trimmed)) {
        return v.selectOption;
    }

    if (/^Invalid input:\s*expected (?:number|int)/i.test(trimmed)) {
        return v.validNumber;
    }

    if (/^Invalid input:\s*expected string,\s*received (?:undefined|null)$/i.test(trimmed)) {
        return v.required;
    }

    return trimmed;
}

export function configureZodErrors(): void {
    if (zodConfigured) return;
    zodConfigured = true;

    zod.config({
        customError: (issue) => {
            const v = getValidationDict();

            if (issue.code === "invalid_type") {
                if (
                    issue.input === undefined ||
                    issue.input === null ||
                    (typeof issue.input === "number" && Number.isNaN(issue.input))
                ) {
                    return v.required;
                }
                if (issue.expected === "number" || issue.expected === "int") {
                    return v.validNumber;
                }
            }

            if (issue.code === "too_small") {
                if (issue.origin === "string") {
                    if (Number(issue.minimum) <= 1 || issue.input === "") {
                        return v.required;
                    }
                    return v.minChars.replace("{min}", String(issue.minimum));
                }
                if (issue.origin === "array") {
                    return Number(issue.minimum) <= 1
                        ? v.minItemsOne
                        : v.minItems.replace("{min}", String(issue.minimum));
                }
                if (issue.origin === "number" || issue.origin === "int") {
                    return v.minNumber.replace("{min}", String(issue.minimum));
                }
            }

            if (issue.code === "too_big") {
                if (issue.origin === "string") {
                    return v.maxChars.replace("{max}", String(issue.maximum));
                }
                if (issue.origin === "number" || issue.origin === "int") {
                    return v.maxNumber.replace("{max}", String(issue.maximum));
                }
            }

            if (issue.code === "invalid_format") {
                if (issue.format === "uuid") {
                    return issue.input === "" || issue.input == null
                        ? v.selectOption
                        : v.selectValidOption;
                }
                if (issue.format === "email") {
                    return v.validEmail;
                }
                if (issue.format === "url") {
                    return v.validUrl;
                }
                if (issue.format === "datetime") {
                    return v.validDateTime;
                }
            }

            if (issue.code === "invalid_value") {
                return issue.input === "" || issue.input == null
                    ? v.selectOption
                    : v.selectValidOption;
            }

            return undefined;
        },
    });
}
