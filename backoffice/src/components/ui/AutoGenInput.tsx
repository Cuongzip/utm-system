"use client";

import React, { forwardRef, useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { FormInput, type FormInputProps } from "./FormInput";
import { Switch } from "./Switch";

interface AutoGenInputProps extends Omit<FormInputProps, "placeholder"> {
    label: string;
    showAutoGen?: boolean;
    manualPlaceholder: string;
}

export const AutoGenInput = forwardRef<HTMLInputElement, AutoGenInputProps>(
    (
        {
            id,
            label,
            showAutoGen = true,
            manualPlaceholder,
            disabled,
            required,
            value,
            onChange,
            error,
            ...props
        },
        ref
    ) => {
        const t = useTranslations("common");
        const autoGenPlaceholder = t("autoGenPlaceholder");
        const autoGenLabel = t("autoGen");
        const isControlled = value !== undefined;

        const [isAutoGen, setIsAutoGen] = useState(() => {
            if (!showAutoGen) return false;
            if (isControlled && value !== "") return false;
            return true;
        });

        const onChangeRef = useRef(onChange);
        onChangeRef.current = onChange;

        useEffect(() => {
            if (!showAutoGen) {
                setIsAutoGen(false);
                return;
            }
            if (isControlled && value !== "" && value !== undefined) {
                setIsAutoGen(false);
            }
        }, [showAutoGen, isControlled, value]);

        useEffect(() => {
            if (isAutoGen && onChangeRef.current) {
                onChangeRef.current({
                    target: {
                        name: props.name || id,
                        value: undefined,
                    },
                } as unknown as React.ChangeEvent<HTMLInputElement>);
            }
        }, [isAutoGen, props.name, id]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!onChange) return;
            const val = e.target.value;
            const nextValue = val.trim() === "" ? undefined : val;
            onChange({
                ...e,
                target: {
                    ...e.target,
                    name: props.name || id,
                    value: nextValue as unknown as string,
                },
            });
        };

        const handleToggle = (checked: boolean) => {
            setIsAutoGen(checked);

            if (onChange) {
                onChange({
                    target: {
                        name: props.name || id,
                        value: checked ? undefined : "",
                    },
                } as unknown as React.ChangeEvent<HTMLInputElement>);
            }
        };

        const toggleSwitch = showAutoGen ? (
            <Switch label={autoGenLabel} checked={isAutoGen} onCheckedChange={handleToggle} />
        ) : undefined;

        const inputProps = isControlled
            ? { value: isAutoGen ? "" : (value ?? "") }
            : isAutoGen
              ? { value: "" }
              : {};

        return (
            <FormInput
                ref={ref}
                id={id}
                label={label}
                labelRight={toggleSwitch}
                required={showAutoGen ? !isAutoGen && required : required}
                disabled={disabled || isAutoGen}
                placeholder={isAutoGen ? autoGenPlaceholder : manualPlaceholder}
                onChange={handleChange}
                error={isAutoGen ? undefined : error}
                {...props}
                {...inputProps}
            />
        );
    }
);

AutoGenInput.displayName = "AutoGenInput";
