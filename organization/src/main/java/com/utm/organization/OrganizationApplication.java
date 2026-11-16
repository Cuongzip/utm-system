package com.utm.organization;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication(scanBasePackages = {"com.utm.organization", "com.utm.commonlibrary"})
@ConfigurationPropertiesScan
public class OrganizationApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrganizationApplication.class, args);
    }
}
