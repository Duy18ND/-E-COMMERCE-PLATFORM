package com.ecommerce.gateway.filter;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.filter.OrderedGatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.cloud.gateway.filter.factory.RemoveRequestHeaderGatewayFilterFactory;
import org.springframework.cloud.gateway.handler.FilteringWebHandler;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
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

class SpoofedHeaderSanitizationFilterTest {

    private static final String JWT_SECRET = "ecommerce-super-secret-key-change-in-production-must-be-256-bits";

    @Test
    @DisplayName("Runs at HIGHEST_PRECEDENCE and strips spoofed X-User-* and X-Internal-Service-Key headers on public routes")
    void stripsSpoofedHeadersBeforeRouting() {
        SpoofedHeaderSanitizationFilter filter = new SpoofedHeaderSanitizationFilter();
        assertThat(filter.getOrder()).isEqualTo(Ordered.HIGHEST_PRECEDENCE);

        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/products")
                .header("X-User-Id", "1")
                .header("X-User-Roles", "ROLE_ADMIN")
                .header("X-User-Email", "attacker@evil.com")
                .header("X-Internal-Service-Key", "spoofed-secret")
                .header("X-Custom-Client-Header", "keep-me")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicReference<ServerWebExchange> forwarded = new AtomicReference<>();
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(any(ServerWebExchange.class))).thenAnswer(invocation -> {
            forwarded.set(invocation.getArgument(0));
            return Mono.empty();
        });

        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();

        HttpHeaders headers = forwarded.get().getRequest().getHeaders();
        assertThat(headers.getFirst("X-User-Id")).isNull();
        assertThat(headers.getFirst("X-User-Roles")).isNull();
        assertThat(headers.getFirst("X-User-Email")).isNull();
        assertThat(headers.getFirst("X-Internal-Service-Key")).isNull();
        assertThat(headers.getFirst("X-Custom-Client-Header")).isEqualTo("keep-me");
    }

    @Test
    @DisplayName("Executes before AuthenticationFilter in FilteringWebHandler and preserves authenticated X-User-* headers")
    void preservesJwtAuthenticatedHeadersAfterSanitizationAndDefaultFilters() {
        AuthenticationFilter authenticationFilter = new AuthenticationFilter();
        ReflectionTestUtils.setField(authenticationFilter, "jwtSecret", JWT_SECRET);

        SecretKey key = Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8));
        String jwt = Jwts.builder()
                .subject("customer@ecommerce.com")
                .claim("userId", 42L)
                .claim("roles", List.of("ROLE_CUSTOMER"))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60000L))
                .signWith(key)
                .compact();

        RemoveRequestHeaderGatewayFilterFactory.NameConfig removeConfig =
                new AbstractGatewayFilterFactory.NameConfig();
        removeConfig.setName("X-Internal-Service-Key");
        GatewayFilter removeInternalKey = new OrderedGatewayFilter(
                new RemoveRequestHeaderGatewayFilterFactory().apply(removeConfig), 2);
        GatewayFilter authRouteFilter = new OrderedGatewayFilter(
                authenticationFilter.apply(new AuthenticationFilter.Config()), 2);

        Route route = Route.async()
                .id("order-service")
                .uri("http://localhost:8083")
                .predicate(ex -> true)
                .filters(removeInternalKey, authRouteFilter)
                .build();

        AtomicReference<ServerWebExchange> downstreamExchange = new AtomicReference<>();
        GlobalFilter terminalCapture = new OrderedCaptureGlobalFilter(downstreamExchange);

        FilteringWebHandler webHandler = new FilteringWebHandler(
                List.of(new SpoofedHeaderSanitizationFilter(), terminalCapture)
        );

        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/orders")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt)
                .header("X-User-Id", "999")
                .header("X-User-Roles", "ROLE_ADMIN")
                .header("X-User-Email", "spoof@evil.com")
                .header("X-Internal-Service-Key", "spoofed-key")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        exchange.getAttributes().put(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR, route);

        StepVerifier.create(webHandler.handle(exchange)).verifyComplete();

        HttpHeaders headers = downstreamExchange.get().getRequest().getHeaders();
        assertThat(headers.getFirst("X-User-Id")).isEqualTo("42");
        assertThat(headers.getFirst("X-User-Roles")).isEqualTo("ROLE_CUSTOMER");
        assertThat(headers.getFirst("X-User-Email")).isEqualTo("customer@ecommerce.com");
        assertThat(headers.getFirst("X-Internal-Service-Key")).isNull();
    }

    private static final class OrderedCaptureGlobalFilter implements GlobalFilter, Ordered {
        private final AtomicReference<ServerWebExchange> capture;

        private OrderedCaptureGlobalFilter(AtomicReference<ServerWebExchange> capture) {
            this.capture = capture;
        }

        @Override
        public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
            capture.set(exchange);
            return Mono.empty();
        }

        @Override
        public int getOrder() {
            return Ordered.LOWEST_PRECEDENCE;
        }
    }
}

