package com.ecommerce.gateway.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.test.StepVerifier;

import java.net.InetSocketAddress;

class RateLimiterConfigTest {

    private RateLimiterConfig rateLimiterConfig;

    @BeforeEach
    void setUp() {
        rateLimiterConfig = new RateLimiterConfig();
    }

    @Test
    @DisplayName("userKeyResolver should resolve key from X-User-Id header if present")
    void testResolveFromUserIdHeader() {
        KeyResolver resolver = rateLimiterConfig.userKeyResolver();
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/orders")
                .header("X-User-Id", "999")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        StepVerifier.create(resolver.resolve(exchange))
                .expectNext("user:999")
                .verifyComplete();
    }

    @Test
    @DisplayName("userKeyResolver should resolve key from Authorization header if X-User-Id is absent")
    void testResolveFromAuthorizationHeader() {
        KeyResolver resolver = rateLimiterConfig.userKeyResolver();
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/orders")
                .header(HttpHeaders.AUTHORIZATION, "Bearer sample-jwt-token")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        StepVerifier.create(resolver.resolve(exchange))
                .expectNextMatches(key -> key.startsWith("token:"))
                .verifyComplete();
    }

    @Test
    @DisplayName("ipKeyResolver should resolve client remote IP address")
    void testResolveFromRemoteIp() {
        KeyResolver resolver = rateLimiterConfig.ipKeyResolver();
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/orders")
                .remoteAddress(new InetSocketAddress("192.168.1.100", 8080))
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        StepVerifier.create(resolver.resolve(exchange))
                .expectNext("ip:192.168.1.100")
                .verifyComplete();
    }
}
