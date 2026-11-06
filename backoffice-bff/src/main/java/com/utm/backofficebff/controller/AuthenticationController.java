package com.utm.backofficebff.controller;

import com.utm.backofficebff.viewmodel.AuthenticatedUser;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collection;
import java.util.List;
import java.util.Map;

@RestController
public class AuthenticationController {

    private static final String REALM_ACCESS_CLAIM = "realm_access";
    private static final String ROLES_CLAIM = "roles";

    @GetMapping("/authentication/user")
    public ResponseEntity<AuthenticatedUser> user(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) {
            return ResponseEntity.ok(AuthenticatedUser.anonymous());
        }

        String username = principal.getAttribute("preferred_username");
        if (username == null || username.isBlank()) {
            username = principal.getName();
        }

        String email = principal.getAttribute("email");
        String fullName = principal.getAttribute("name");
        if (fullName == null || fullName.isBlank()) {
            String givenName = principal.getAttribute("given_name");
            String familyName = principal.getAttribute("family_name");
            fullName = ((givenName != null ? givenName : "") + " " + (familyName != null ? familyName : "")).trim();
        }

        List<String> roles = extractRoles(principal);

        return ResponseEntity.ok(new AuthenticatedUser(username, email, fullName, roles));
    }

    private List<String> extractRoles(OAuth2User principal) {
        if (principal.getAuthorities() != null) {
            List<String> roles = principal.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .filter(auth -> auth != null && auth.startsWith("ROLE_"))
                    .map(auth -> auth.substring(5))
                    .toList();
            if (!roles.isEmpty()) {
                return roles;
            }
        }

        if (principal.getAttribute(REALM_ACCESS_CLAIM) instanceof Map<?, ?> realmAccess
                && realmAccess.get(ROLES_CLAIM) instanceof Collection<?> roleList) {
            return roleList.stream()
                    .filter(r -> r instanceof String s && !s.isBlank())
                    .map(Object::toString)
                    .toList();
        }

        return List.of();
    }
}
