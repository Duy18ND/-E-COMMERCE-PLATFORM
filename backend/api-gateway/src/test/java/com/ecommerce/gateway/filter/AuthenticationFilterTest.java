package com.ecommerce.gateway.filter;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthenticationFilterTest {

    private AuthenticationFilter authenticationFilter;
    private final String secret = "ecommerce-super-secret-key-change-in-production-must-be-256-bits";
    private SecretKey signingKey;

    @BeforeEach
    void setUp() {
        authenticationFilter = new AuthenticationFilter();
        ReflectionTestUtils.setField(authenticationFilter, "jwtSecret", secret);
        signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    private String createToken(Long userId, String email, List<String> roles, long expirationOffsetMs) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationOffsetMs);
        return Jwts.builder()
                .subject(email)
                .claim("userId", userId)
                .claim("roles", roles)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey)
                .compact();
    }

    @Test
    @DisplayName("Should pass and mutate request headers when JWT is valid")
    void testValidJwtToken() {
        String token = createToken(42L, "customer@ecommerce.com", List.of("ROLE_CUSTOMER"), 60000L);

        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/orders")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicReference<ServerWebExchange> mutatedExchangeRef = new AtomicReference<>();
        GatewayFilterChain filterChain = mock(GatewayFilterChain.class);
        when(filterChain.filter(any(ServerWebExchange.class))).thenAnswer(invocation -> {
            mutatedExchangeRef.set(invocation.getArgument(0));
            return Mono.empty();
        });

        StepVerifier.create(authenticationFilter.apply(new AuthenticationFilter.Config()).filter(exchange, filterChain))
                .verifyComplete();

        assertThat(mutatedExchangeRef.get()).isNotNull();
        HttpHeaders headers = mutatedExchangeRef.get().getRequest().getHeaders();
        assertThat(headers.getFirst("X-User-Id")).isEqualTo("42");
        assertThat(headers.getFirst("X-User-Roles")).isEqualTo("ROLE_CUSTOMER");
        assertThat(headers.getFirst("X-User-Email")).isEqualTo("customer@ecommerce.com");
    }

    @Test
    @DisplayName("Should return 401 Unauthorized when Authorization header is missing")
    void testMissingAuthorizationHeader() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/orders").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        GatewayFilterChain filterChain = mock(GatewayFilterChain.class);

        StepVerifier.create(authenticationFilter.apply(new AuthenticationFilter.Config()).filter(exchange, filterChain))
                .verifyComplete();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Should return 401 Unauthorized when Authorization header does not start with Bearer")
    void testInvalidHeaderFormat() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/orders")
                .header(HttpHeaders.AUTHORIZATION, "Basic 123456")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        GatewayFilterChain filterChain = mock(GatewayFilterChain.class);

        StepVerifier.create(authenticationFilter.apply(new AuthenticationFilter.Config()).filter(exchange, filterChain))
                .verifyComplete();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Should return 401 Unauthorized when JWT token is expired")
    void testExpiredJwtToken() {
        String token = createToken(42L, "customer@ecommerce.com", List.of("ROLE_CUSTOMER"), -10000L);

        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/orders")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        GatewayFilterChain filterChain = mock(GatewayFilterChain.class);

        StepVerifier.create(authenticationFilter.apply(new AuthenticationFilter.Config()).filter(exchange, filterChain))
                .verifyComplete();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Should return 401 Unauthorized when JWT signature is invalid")
    void testInvalidSignature() {
        SecretKey differentKey = Keys.hmacShaKeyFor("different-key-that-does-not-match-256-bits-length-here".getBytes(StandardCharsets.UTF_8));
        String token = Jwts.builder()
                .subject("customer@ecommerce.com")
                .claim("userId", 42L)
                .claim("roles", List.of("ROLE_CUSTOMER"))
                .signWith(differentKey)
                .compact();

        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/orders")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        GatewayFilterChain filterChain = mock(GatewayFilterChain.class);

        StepVerifier.create(authenticationFilter.apply(new AuthenticationFilter.Config()).filter(exchange, filterChain))
                .verifyComplete();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
