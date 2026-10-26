package com.ecommerce.gateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Map;

/**
 * Fallback controller for Circuit Breaker responses.
 * Returns a structured error response when a downstream service is unavailable.
 */
@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @RequestMapping("/auth")
    public Mono<ResponseEntity<Map<String, Object>>> authFallback() {
        return Mono.just(buildFallback("auth-service"));
    }

    @RequestMapping("/product")
    public Mono<ResponseEntity<Map<String, Object>>> productFallback() {
        return Mono.just(buildFallback("product-service"));
    }

    @RequestMapping("/order")
    public Mono<ResponseEntity<Map<String, Object>>> orderFallback() {
        return Mono.just(buildFallback("order-service"));
    }

    @RequestMapping("/payment")
    public Mono<ResponseEntity<Map<String, Object>>> paymentFallback() {
        return Mono.just(buildFallback("payment-service"));
    }

    private ResponseEntity<Map<String, Object>> buildFallback(String serviceName) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 503,
                "error", "Service Unavailable",
                "message", "The " + serviceName + " is currently unavailable. Please try again later.",
                "service", serviceName
            ));
    }
}
