package com.utm.backofficebff.controller;

import com.utm.backofficebff.viewmodel.AuthenticatedUser;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthenticationController {

    @GetMapping("/authentication/user")
    public ResponseEntity<AuthenticatedUser> user(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) {
            return ResponseEntity.ok(new AuthenticatedUser("anonymous"));
        }
        String username = principal.getAttribute("preferred_username");
        if (username == null) {
            username = principal.getName();
        }
        return ResponseEntity.ok(new AuthenticatedUser(username));
    }
}