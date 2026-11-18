package com.ecommerce.chatbot.client;

import com.ecommerce.chatbot.client.dto.OrderDto;
import com.ecommerce.chatbot.client.dto.VoucherDto;
import com.ecommerce.chatbot.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;

@FeignClient(name = "order-service")
public interface OrderClient {

    @GetMapping("/api/v1/orders/my-orders")
    ApiResponse<List<OrderDto>> getMyOrders(
            @RequestHeader("X-User-Id") Long authenticatedUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles
    );

    @GetMapping("/api/v1/orders/{id}")
    ApiResponse<OrderDto> getOrderById(
            @PathVariable("id") Long id,
            @RequestHeader("X-User-Id") Long authenticatedUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles
    );

    @GetMapping("/api/v1/orders/{id}/history")
    ApiResponse<List<OrderDto.OrderStatusHistoryDto>> getOrderStatusHistory(
            @PathVariable("id") Long id,
            @RequestHeader("X-User-Id") Long authenticatedUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles
    );

    @GetMapping("/api/v1/vouchers/active")
    ApiResponse<List<VoucherDto>> getActiveVouchers(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId
    );
}

