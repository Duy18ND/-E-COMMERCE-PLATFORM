package com.ecommerce.gateway.controller;

import com.ecommerce.gateway.dto.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;

class FallbackControllerTest {

    private FallbackController fallbackController;

    @BeforeEach
    void setUp() {
        fallbackController = new FallbackController();
    }

    @Test
    @DisplayName("Auth fallback should return error ApiResponse")
    void testAuthFallback() {
        StepVerifier.create(fallbackController.authFallback())
                .assertNext(response -> {
                    assertThat(response.isSuccess()).isFalse();
                    assertThat(response.getMessage()).contains("Auth Service");
                })
                .verifyComplete();
    }

    @Test
    @DisplayName("Product fallback should return error ApiResponse")
    void testProductFallback() {
        StepVerifier.create(fallbackController.productFallback())
                .assertNext(response -> {
                    assertThat(response.isSuccess()).isFalse();
                    assertThat(response.getMessage()).contains("Product Service");
                })
                .verifyComplete();
    }

    @Test
    @DisplayName("Order fallback should return error ApiResponse")
    void testOrderFallback() {
        StepVerifier.create(fallbackController.orderFallback())
                .assertNext(response -> {
                    assertThat(response.isSuccess()).isFalse();
                    assertThat(response.getMessage()).contains("Order Service");
                })
                .verifyComplete();
    }

    @Test
    @DisplayName("Payment fallback should return error ApiResponse")
    void testPaymentFallback() {
        StepVerifier.create(fallbackController.paymentFallback())
                .assertNext(response -> {
                    assertThat(response.isSuccess()).isFalse();
                    assertThat(response.getMessage()).contains("Payment Service");
                })
                .verifyComplete();
    }
}
