package com.utm.user.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(title = "User Service API", version = "1.0", description = "Documentation User Service API v1.0"),
        servers = @Server(url = "${server.servlet.context-path:/user}", description = "Default Server URL")
)
public class OpenApiConfig {
}
