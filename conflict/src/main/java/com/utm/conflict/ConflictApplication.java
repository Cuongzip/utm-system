package com.utm.conflict;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {"com.utm.conflict", "com.utm.commonlibrary"})
@EnableScheduling
public class ConflictApplication {

    public static void main(String[] args) {
        SpringApplication.run(ConflictApplication.class, args);
    }
}
