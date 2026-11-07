"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib";

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label?: string;
    labelRight?: React.ReactNode;
    error?: string;
    required?: boolean;
    containerClassName?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
    (
        { id, label, labelRight, error, required = false, className, containerClassName, ...props },
        ref
    ) => {
        return (
            <div className={cn("form-group", containerClassName)}>
                {label && (
                    <div className="flex items-center justify-between">
                        <label className="form-label" htmlFor={id}>
                            {label}
                            {required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {labelRight}
                    </div>
                )}
                <input
                    ref={ref}
                    id={id}
                    className={cn("form-input", error && "form-input-error", className)}
                    {...props}
                />
                {error && <span className="form-error-msg">{error}</span>}
            </div>
        );
    }
);

FormInput.displayName = "FormInput";
