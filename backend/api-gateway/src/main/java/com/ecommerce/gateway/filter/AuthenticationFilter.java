package com.ecommerce.gateway.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SecurityException;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Gateway filter for JWT authentication & authorization.
 * Extracts JWT token from Authorization header, validates signature & expiration,
 * extracts userId, roles, and email, then mutates downstream request headers
 * (X-User-Id, X-User-Roles, X-User-Email).
 */
@Slf4j
@Component("AuthenticationFilter")
public class AuthenticationFilter extends AbstractGatewayFilterFactory<AuthenticationFilter.Config> {

    public static final String TOKEN_BLACKLIST_PREFIX = "jwt:blacklist:";

    public static final List<String> SPOOFED_HEADERS = List.of(
            "X-User-Id",
            "X-User-Roles",
            "X-User-Email",
            "X-Internal-Service-Key"
    );

    @Value("${jwt.secret:ecommerce-super-secret-key-change-in-production-must-be-256-bits}")
    private String jwtSecret;

    @Autowired(required = false)
    private ReactiveStringRedisTemplate redisTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public AuthenticationFilter() {
        super(Config.class);
    }

    @Override
    public String name() {
        return "AuthenticationFilter";
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();

            // 1. Kiểm tra sự tồn tại của header Authorization
            if (!request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                if (config != null && config.isOptional()) {
                    // Route công khai hỗ trợ tùy chọn JWT: xóa các header danh tính và nội bộ nếu client cố tình giả mạo
                    ServerHttpRequest sanitizedRequest = request.mutate()
                            .headers(AuthenticationFilter::stripSpoofedHeaders)
                            .build();
                    return chain.filter(exchange.mutate().request(sanitizedRequest).build());
                }
                log.warn("[Auth Filter] Missing Authorization header for: {}", request.getURI().getPath());
                return onError(exchange, "Thiếu header Authorization", HttpStatus.UNAUTHORIZED);
            }

            String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                log.warn("[Auth Filter] Invalid Authorization header format for: {}", request.getURI().getPath());
                return onError(exchange, "Header Authorization phải có định dạng 'Bearer <token>'", HttpStatus.UNAUTHORIZED);
            }

            String token = authHeader.substring(7).trim();
            if (token.isEmpty()) {
                log.warn("[Auth Filter] Empty token for: {}", request.getURI().getPath());
                return onError(exchange, "Token xác thực không được để trống", HttpStatus.UNAUTHORIZED);
            }

            // 2. Validate token bằng jjwt và trích xuất claims
            Claims claims;
            try {
                claims = Jwts.parser()
                        .verifyWith(getSigningKey())
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();
            } catch (ExpiredJwtException ex) {
                log.warn("[Auth Filter] Expired JWT token: {}", ex.getMessage());
                return onError(exchange, "Token đã hết hạn. Vui lòng đăng nhập lại.", HttpStatus.UNAUTHORIZED);
            } catch (SecurityException | MalformedJwtException ex) {
                log.warn("[Auth Filter] Invalid JWT signature or format: {}", ex.getMessage());
                return onError(exchange, "Chữ ký hoặc định dạng token không hợp lệ", HttpStatus.UNAUTHORIZED);
            } catch (UnsupportedJwtException ex) {
                log.warn("[Auth Filter] Unsupported JWT token: {}", ex.getMessage());
                return onError(exchange, "Định dạng token không được hỗ trợ", HttpStatus.UNAUTHORIZED);
            } catch (IllegalArgumentException ex) {
                log.warn("[Auth Filter] JWT claims empty or null: {}", ex.getMessage());
                return onError(exchange, "Claims token không hợp lệ", HttpStatus.UNAUTHORIZED);
            } catch (Exception ex) {
                log.error("[Auth Filter] Unexpected error during JWT validation: {}", ex.getMessage());
                return onError(exchange, "Xác thực token thất bại: " + ex.getMessage(), HttpStatus.UNAUTHORIZED);
            }

            // 2b & 3. Kiểm tra JWT blacklist trong Redis trước khi trích xuất danh tính và chuyển tiếp
            return isTokenBlacklisted(token).flatMap(isBlacklisted -> {
                if (Boolean.TRUE.equals(isBlacklisted)) {
                    log.warn("[Auth Filter] Rejected blacklisted JWT token for: {}", request.getURI().getPath());
                    return onError(exchange, "Token đã bị thu hồi. Vui lòng đăng nhập lại.", HttpStatus.UNAUTHORIZED);
                }

                Object userIdObj = claims.get("userId");
                String userId = userIdObj != null ? String.valueOf(userIdObj) : "";

                String email = claims.getSubject();
                if (email == null) {
                    email = "";
                }

                String rolesStr = "";
                Object rolesObj = claims.get("roles");
                if (rolesObj instanceof List<?> roleList) {
                    rolesStr = roleList.stream()
                            .map(Object::toString)
                            .collect(Collectors.joining(","));
                } else if (rolesObj != null) {
                    rolesStr = rolesObj.toString();
                }

                log.info("[Auth Filter] Authenticated: userId={}, email={}, roles={}", userId, email, rolesStr);

                // 4. Mutate request để xóa header giả mạo từ client và gắn thông tin xác thực trước khi route downstream
                ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                        .headers(AuthenticationFilter::stripSpoofedHeaders)
                        .header("X-User-Id", userId)
                        .header("X-User-Roles", rolesStr)
                        .header("X-User-Email", email)
                        .build();

                return chain.filter(exchange.mutate().request(mutatedRequest).build());
            });
        };
    }

    public static void stripSpoofedHeaders(HttpHeaders headers) {
        SPOOFED_HEADERS.forEach(headers::remove);
    }

    private Mono<Boolean> isTokenBlacklisted(String token) {
        if (redisTemplate == null || token == null || token.isEmpty()) {
            return Mono.just(false);
        }
        try {
            Mono<Boolean> existsMono = redisTemplate.hasKey(TOKEN_BLACKLIST_PREFIX + token);
            if (existsMono == null) {
                return Mono.just(false);
            }
            return existsMono
                    .defaultIfEmpty(false)
                    .onErrorResume(ex -> {
                        log.warn("[Auth Filter] Failed to check Redis JWT blacklist: {}", ex.getMessage());
                        return Mono.just(false);
                    });
        } catch (Exception ex) {
            log.warn("[Auth Filter] Redis blacklist lookup exception: {}", ex.getMessage());
            return Mono.just(false);
        }
    }

    private Mono<Void> onError(ServerWebExchange exchange, String message, HttpStatus httpStatus) {
        return GatewayErrorResponseWriter.writeJsonError(exchange, httpStatus, message, objectMapper);
    }

    @Getter
    @Setter
    public static class Config {
        /**
         * When true, requests without an Authorization header pass through as anonymous
         * (after stripping any spoofed X-User-* headers), while requests carrying a
         * Bearer token are still validated and enriched with X-User-Id / X-User-Roles.
         */
        private boolean optional = false;
    }
}
