package com.utm.commonlibrary.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.core.convert.converter.ConverterFactory;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;

@SuppressWarnings({"rawtypes", "unchecked"})
public class StringToEnumConverterFactory implements ConverterFactory<String, Enum> {

    @Override
    public <T extends Enum> Converter<String, T> getConverter(Class<T> targetType) {
        return new StringToEnumConverter<>(targetType);
    }

    private static class StringToEnumConverter<T extends Enum> implements Converter<String, T> {

        private final Class<T> enumType;

        StringToEnumConverter(Class<T> enumType) {
            this.enumType = enumType;
        }

        @Override
        public T convert(String source) {
            if (source.trim().isEmpty()) {
                return null;
            }
            String trimmed = source.trim();

            Method fromValueMethod = findFromValueMethod(enumType);
            if (fromValueMethod != null) {
                try {
                    return (T) fromValueMethod.invoke(null, trimmed);
                } catch (Exception ignored) {
                }
            }

            for (T constant : enumType.getEnumConstants()) {
                if (constant.name().equalsIgnoreCase(trimmed)) {
                    return constant;
                }
                try {
                    Method getValueMethod = enumType.getMethod("getValue");
                    Object val = getValueMethod.invoke(constant);
                    if (val != null && val.toString().equalsIgnoreCase(trimmed)) {
                        return constant;
                    }
                } catch (Exception ignored) {
                }
            }

            throw new IllegalArgumentException(
                    "Unknown constant '" + source + "' for enum " + enumType.getSimpleName()
            );
        }

        private Method findFromValueMethod(Class<T> clazz) {
            for (Method method : clazz.getMethods()) {
                if (Modifier.isStatic(method.getModifiers())
                        && ("fromValue".equals(method.getName()) || "fromString".equals(method.getName()))
                        && method.getParameterCount() == 1
                        && method.getParameterTypes()[0].equals(String.class)
                        && clazz.isAssignableFrom(method.getReturnType())) {
                    return method;
                }
            }
            return null;
        }
    }
}
