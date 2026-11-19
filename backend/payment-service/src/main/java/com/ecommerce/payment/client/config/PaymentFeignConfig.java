package com.ecommerce.payment.client.config;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.util.StringUtils;

/**
 * Feign configuration riêng cho giao tiếp nội bộ từ payment-service sang order-service.
 * Tự động gắn header X-Internal-Service-Key cho các internal endpoints.
 */
public class PaymentFeignConfig {

    @Value("${internal.service-key:ecommerce-internal-service-secret-2026}")
    private String internalServiceKey = "ecommerce-internal-service-secret-2026";

    @Bean
    public RequestInterceptor internalServiceKeyInterceptor() {
        return template -> {
            if (StringUtils.hasText(internalServiceKey)) {
                template.header("X-Internal-Service-Key", internalServiceKey);
            }
        };
    }
}
