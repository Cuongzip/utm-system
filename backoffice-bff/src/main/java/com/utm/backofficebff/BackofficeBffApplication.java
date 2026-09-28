package com.utm.backofficebff;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan("com.utm.backofficebff.config")
public class BackofficeBffApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackofficeBffApplication.class, args);
    }
}
