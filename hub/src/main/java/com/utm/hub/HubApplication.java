package com.utm.hub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication(scanBasePackages = {"com.utm.hub", "com.utm.commonlibrary"})
@ConfigurationPropertiesScan
public class HubApplication {

    public static void main(String[] args) {
        SpringApplication.run(HubApplication.class, args);
    }
}
