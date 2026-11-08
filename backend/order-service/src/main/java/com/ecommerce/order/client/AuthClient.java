package com.ecommerce.order.client;

import com.ecommerce.order.client.config.FeignConfig;
import com.ecommerce.order.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * [Task ECOM-145 / ECOM-326] Feign Client kết nối tới auth-service để đồng bộ tổng số khách hàng cho Dashboard Admin.
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 */
@FeignClient(name = "auth-service", configuration = FeignConfig.class)
public interface AuthClient {

    @GetMapping("/api/v1/admin/customers/count")
    ApiResponse<Long> countCustomers();
}

