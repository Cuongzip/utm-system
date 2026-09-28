package com.utm.backofficebff.controller;

import com.utm.backofficebff.service.AuthService;
import com.utm.backofficebff.viewmodel.LoginRequestVm;
import com.utm.backofficebff.viewmodel.RefreshTokenRequestVm;
import com.utm.backofficebff.viewmodel.TokenResponseVm;
import com.utm.backofficebff.viewmodel.UserSummaryVm;
import com.utm.commonlibrary.utils.AuthenticationUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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
@Tag(name = "Authentication", description = "Endpoints for authenticating and exchanging tokens")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "Login and obtain Access Token", description = "Sends credentials to Keycloak to obtain JWT Access Token, ID Token and Refresh Token")
    public ResponseEntity<TokenResponseVm> login(@Valid @RequestBody LoginRequestVm loginRequestVm) {
        TokenResponseVm tokenResponse = authService.login(loginRequestVm);
        return ResponseEntity.ok(tokenResponse);
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "Refresh Access Token", description = "Exchange a valid refresh token for a new access token")
    public ResponseEntity<TokenResponseVm> refreshToken(@Valid @RequestBody RefreshTokenRequestVm refreshTokenRequestVm) {
        TokenResponseVm tokenResponse = authService.refreshToken(refreshTokenRequestVm);
        return ResponseEntity.ok(tokenResponse);
    }

    @GetMapping("/me")
    @Operation(
            summary = "Get current authenticated user info",
            description = "Extracts user information from the JWT Bearer Token",
            security = @SecurityRequirement(name = "Bearer Authentication")
    )
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
