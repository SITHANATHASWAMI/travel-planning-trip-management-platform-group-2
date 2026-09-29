package com.tripnest.controller;

import com.tripnest.config.GoogleOAuthConfig;
import com.tripnest.dto.AuthResponse;
import com.tripnest.dto.LoginRequest;
import com.tripnest.dto.RegisterRequest;
import com.tripnest.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final GoogleOAuthConfig googleOAuthConfig;

    public AuthController(AuthService authService, GoogleOAuthConfig googleOAuthConfig) {
        this.authService       = authService;
        this.googleOAuthConfig = googleOAuthConfig;
    }

    /**
     * Health check / keep-alive endpoint.
     * Also used by GoogleLoginButton to check if OAuth is enabled.
     */
    @GetMapping("/oauth-enabled")
    public ResponseEntity<Map<String, Object>> oauthEnabled() {
        boolean enabled = googleOAuthConfig.enabled();
        return ResponseEntity.ok(Map.of(
                "enabled", enabled,
                "status", "ok",
                "reason", enabled ? "" : "Google OAuth not configured."
        ));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * Step 1 of password reset — user submits their email.
     * Always returns 200 so we don't leak whether the email exists.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "").trim();
        if (email.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required."));
        }
        try {
            authService.forgotPassword(email);
        } catch (Exception ignored) {
            // Swallow — don't leak account existence
        }
        return ResponseEntity.ok(Map.of("message",
                "If that email is registered, a reset link has been sent."));
    }

    /**
     * Step 2 — user clicks link in email, submits new password.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @RequestBody Map<String, String> body) {
        String token    = body.getOrDefault("token", "").trim();
        String password = body.getOrDefault("password", "").trim();
        if (token.isEmpty() || password.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Token and password are required."));
        }
        try {
            authService.resetPassword(token, password);
            return ResponseEntity.ok(Map.of("message",
                    "Password updated successfully. You can now log in."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Email verification — user clicks link in welcome email.
     * GET /api/auth/verify-email?token=uuid
     * Redirects browser to /verify-email?status=verified|already_verified|invalid
     */
    @GetMapping("/verify-email")
    public ResponseEntity<Void> verifyEmail(@RequestParam String token) {
        String frontendBase = "http://localhost:3000";
        try {
            String result = authService.verifyEmail(token);
            return ResponseEntity
                    .status(302)
                    .header("Location", frontendBase + "/verify-email?status=" + result)
                    .build();
        } catch (Exception e) {
            return ResponseEntity
                    .status(302)
                    .header("Location", frontendBase + "/verify-email?status=invalid")
                    .build();
        }
    }

    /**
     * Resend verification email.
     * POST /api/auth/resend-verification  body: { "email": "..." }
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(
            @RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "").trim();
        if (email.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required."));
        }
        try {
            authService.resendVerification(email);
            return ResponseEntity.ok(Map.of("message", "Verification email resent."));
        } catch (IllegalStateException e) {
            return ResponseEntity.ok(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
