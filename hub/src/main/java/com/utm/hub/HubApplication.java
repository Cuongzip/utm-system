package com.utm.hub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"com.utm.hub", "com.utm.commonlibrary"})
public class HubApplication {

    public static void main(String[] args) {
        SpringApplication.run(HubApplication.class, args);
    }
}
