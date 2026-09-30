package com.utm.hub.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Value("${server.servlet.context-path:/hub}")
    private String contextPath;

    @Bean
    public OpenAPI hubOpenAPI() {
        final String securitySchemeName = "BearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title("Hub / Vertiport Management API")
                        .description("Microservice for managing Takeoff/Landing Hubs, Vertiports, WGS84 coordinates, capacity, and charging pads in the DROPS-UTM ecosystem.")
                        .version("v0.1.0")
                        .contact(new Contact()
                                .name("DROPS-UTM Team")
                                .email("engineering@drops-utm.com"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")))
                .servers(List.of(
                        new Server().url(contextPath).description("Current Context URL"),
                        new Server().url("http://localhost:8084" + contextPath).description("Direct Local Server"),
                        new Server().url("http://localhost:8081" + contextPath).description("Nginx Gateway Server")
                ))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                                .name(securitySchemeName)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Enter Keycloak JWT Bearer token")));
    }
}
