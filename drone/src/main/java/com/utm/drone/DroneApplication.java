package com.utm.drone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication(scanBasePackages = {"com.utm.drone", "com.utm.commonlibrary"})
@ConfigurationPropertiesScan
public class DroneApplication {

    public static void main(String[] args) {
        SpringApplication.run(DroneApplication.class, args);
    }
}
