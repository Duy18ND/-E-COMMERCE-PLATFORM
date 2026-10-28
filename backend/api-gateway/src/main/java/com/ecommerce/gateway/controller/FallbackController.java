package com.ecommerce.gateway.controller;

import com.ecommerce.gateway.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

/**
 * Fallback controller for Resilience4j Circuit Breaker responses.
 * Returns structured Mono<ApiResponse<Object>> when downstream microservices
 * are down, unreachable, or timing out.
 */
@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @RequestMapping("/auth")
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public Mono<ApiResponse<Object>> authFallback() {
        return Mono.just(ApiResponse.error(
                "Dịch vụ xác thực (Auth Service) tạm thời không khả dụng hoặc quá thời gian phản hồi. Vui lòng thử lại sau."
        ));
    }

    @RequestMapping("/product")
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public Mono<ApiResponse<Object>> productFallback() {
        return Mono.just(ApiResponse.error(
                "Dịch vụ sản phẩm (Product Service) tạm thời không khả dụng hoặc quá thời gian phản hồi. Vui lòng thử lại sau."
        ));
    }

    @RequestMapping("/order")
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public Mono<ApiResponse<Object>> orderFallback() {
        return Mono.just(ApiResponse.error(
                "Dịch vụ đơn hàng (Order Service) tạm thời không khả dụng hoặc quá thời gian phản hồi. Vui lòng thử lại sau."
        ));
    }

    @RequestMapping("/payment")
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public Mono<ApiResponse<Object>> paymentFallback() {
        return Mono.just(ApiResponse.error(
                "Dịch vụ thanh toán (Payment Service) tạm thời không khả dụng hoặc quá thời gian phản hồi. Vui lòng thử lại sau."
        ));
    }
}
