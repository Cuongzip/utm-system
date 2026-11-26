package com.utm.weatherais;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication(scanBasePackages = {"com.utm.weatherais", "com.utm.commonlibrary"})
@ConfigurationPropertiesScan
public class WeatherAisApplication {

    public static void main(String[] args) {
        SpringApplication.run(WeatherAisApplication.class, args);
    }
}
