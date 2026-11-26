package com.utm.emergency.config;

import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.model.enumeration.OperationMode;
import com.utm.emergency.model.enumeration.ResponseAction;
import com.utm.emergency.model.enumeration.RootCause;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(String.class, EmergencyType.class, EmergencyType::fromValue);
        registry.addConverter(String.class, EmergencySeverity.class, EmergencySeverity::fromValue);
        registry.addConverter(String.class, IncidentStatus.class, IncidentStatus::fromValue);
        registry.addConverter(String.class, OperationMode.class, OperationMode::fromValue);
        registry.addConverter(String.class, ResponseAction.class, ResponseAction::fromValue);
        registry.addConverter(String.class, RootCause.class, RootCause::fromValue);
    }
}
