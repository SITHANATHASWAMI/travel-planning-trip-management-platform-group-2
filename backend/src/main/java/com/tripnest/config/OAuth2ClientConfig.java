package com.tripnest.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.InMemoryOAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;

@Configuration
public class OAuth2ClientConfig {

    private final GoogleOAuthConfig googleOAuthConfig;

    @Value("${app.backend.url:http://localhost:8080}")
    private String backendUrl;

    public OAuth2ClientConfig(GoogleOAuthConfig googleOAuthConfig) {
        this.googleOAuthConfig = googleOAuthConfig;
    }

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        if (!googleOAuthConfig.enabled()) {
            return registrationId -> null;
        }

        // Use explicit redirect URI to avoid proxy/baseUrl resolution issues
        String redirectUri = backendUrl + "/login/oauth2/code/google";

        ClientRegistration registration = ClientRegistration.withRegistrationId("google")
                .clientId(googleOAuthConfig.getClientId())
                .clientSecret(googleOAuthConfig.getClientSecret())
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri(redirectUri)
                .scope("openid", "profile", "email")
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .tokenUri("https://oauth2.googleapis.com/token")
                .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                .userInfoUri("https://openidconnect.googleapis.com/v1/userinfo")
                .userNameAttributeName("sub")
                .clientName("Google")
                .build();

        return new InMemoryClientRegistrationRepository(registration);
    }

    @Bean
    public OAuth2AuthorizedClientService authorizedClientService(
            ClientRegistrationRepository repository) {
        return new InMemoryOAuth2AuthorizedClientService(repository);
    }
}
