"use client";

import React from "react";
import { cn } from "@/lib";

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label?: string;
    error?: string;
    required?: boolean;
    containerClassName?: string;
}

export function FormInput({
    id,
    label,
    error,
    required = false,
    className,
    containerClassName,
    ...props
}: FormInputProps) {
    return (
        <div className={cn("form-group", containerClassName)}>
            {label && (
                <label className="form-label" htmlFor={id}>
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <input
                id={id}
                className={cn("form-input", error && "form-input-error", className)}
                {...props}
            />
            {error && <span className="form-error-msg">{error}</span>}
        </div>
    );
}

export default FormInput;
