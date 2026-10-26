package com.ecommerce.order.client;

import com.ecommerce.order.client.config.FeignConfig;
import com.ecommerce.order.client.dto.StockReservationItem;
import com.ecommerce.order.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@FeignClient(name = "product-service", path = "/api/v1/products", configuration = FeignConfig.class)
public interface ProductClient {

    @PostMapping("/reserve-stock")
    ApiResponse<Void> reserveStock(@RequestBody List<StockReservationItem> items);

    @PostMapping("/restore-stock")
    ApiResponse<Void> restoreStock(@RequestBody List<StockReservationItem> items);
}
