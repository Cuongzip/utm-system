package com.utm.emergency;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {"com.utm.emergency", "com.utm.commonlibrary"})
@EnableScheduling
@EnableAsync
public class EmergencyApplication {

    public static void main(String[] args) {
        SpringApplication.run(EmergencyApplication.class, args);
    }
}