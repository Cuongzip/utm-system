package com.utm.flight;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"com.utm.flight", "com.utm.commonlibrary"})
public class FlightApplication {

    public static void main(String[] args) {
        SpringApplication.run(FlightApplication.class, args);
    }
}
