package com.utm.connectivity;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {"com.utm.connectivity", "com.utm.commonlibrary"})
@EnableJpaAuditing
@EnableScheduling
@ConfigurationPropertiesScan
public class ConnectivityApplication {

    public static void main(String[] args) {
        SpringApplication.run(ConnectivityApplication.class, args);
    }
}
