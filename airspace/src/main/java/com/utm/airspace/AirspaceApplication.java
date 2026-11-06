package com.utm.airspace;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication(scanBasePackages = {"com.utm.airspace", "com.utm.commonlibrary"})
@ConfigurationPropertiesScan
public class AirspaceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AirspaceApplication.class, args);
    }
}
