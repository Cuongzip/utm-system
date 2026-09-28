package com.utm.backofficebff.controller;

import com.utm.backofficebff.service.AuthService;
import com.utm.backofficebff.viewmodel.LoginRequestVm;
import com.utm.backofficebff.viewmodel.RefreshTokenRequestVm;
import com.utm.backofficebff.viewmodel.TokenResponseVm;
import com.utm.backofficebff.viewmodel.UserSummaryVm;
import com.utm.commonlibrary.utils.AuthenticationUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@Tag(name = "Authentication", description = "Endpoints for user authentication and JWT token issuance")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "Login and obtain Access Token", description = "Submit user credentials (username/password) to Keycloak to obtain Access Token, Refresh Token, and ID Token.")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Login successful",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = TokenResponseVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid username or password", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content)
    })
    public ResponseEntity<TokenResponseVm> login(@Valid @RequestBody LoginRequestVm loginRequestVm) {
        TokenResponseVm tokenResponse = authService.login(loginRequestVm);
        return ResponseEntity.ok(tokenResponse);
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "Refresh Access Token", description = "Submit a valid Refresh Token to obtain a new Access Token upon expiration.")
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Token refreshed successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = TokenResponseVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid or expired refresh token", content = @Content)
    })
    public ResponseEntity<TokenResponseVm> refreshToken(@Valid @RequestBody RefreshTokenRequestVm refreshTokenRequestVm) {
        TokenResponseVm tokenResponse = authService.refreshToken(refreshTokenRequestVm);
        return ResponseEntity.ok(tokenResponse);
    }

    @GetMapping("/me")
    @Operation(
            summary = "Get current authenticated user profile",
            description = "Extract authenticated user details and realm roles from the JWT Bearer token",
            security = @SecurityRequirement(name = "Bearer Authentication")
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "User profile retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = UserSummaryVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<UserSummaryVm> getCurrentUser() {
        Authentication authentication = AuthenticationUtils.getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            Jwt jwt = jwtAuth.getToken();
            String userId = jwt.getSubject();
            String username = jwt.getClaimAsString("preferred_username");
            String email = jwt.getClaimAsString("email");
            String firstName = jwt.getClaimAsString("given_name");
            String lastName = jwt.getClaimAsString("family_name");

            List<String> roles = Collections.emptyList();
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");
            if (realmAccess != null && realmAccess.get("roles") instanceof List<?> roleList) {
                roles = roleList.stream().map(Object::toString).toList();
            }

            return ResponseEntity.ok(new UserSummaryVm(userId, username, email, firstName, lastName, roles));
        }

        return ResponseEntity.ok(new UserSummaryVm(authentication.getName(), authentication.getName(), null, null, null, Collections.emptyList()));
    }
}
