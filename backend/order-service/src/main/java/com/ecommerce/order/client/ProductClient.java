package com.ecommerce.order.client;

import com.ecommerce.order.client.config.FeignConfig;
import com.ecommerce.order.client.dto.FlashSaleReserveRequest;
import com.ecommerce.order.client.dto.ProductResponse;
import com.ecommerce.order.client.dto.StockReservationItem;
import com.ecommerce.order.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(name = "product-service", configuration = FeignConfig.class)
public interface ProductClient {

    @GetMapping("/api/v1/products/{id}")
    ApiResponse<ProductResponse> getProductById(@PathVariable("id") Long id);

    @PostMapping("/api/v1/products/reserve-stock")
    ApiResponse<Void> reserveStock(@RequestBody List<StockReservationItem> items);

    @PostMapping("/api/v1/products/restore-stock")
    ApiResponse<Void> restoreStock(@RequestBody List<StockReservationItem> items);

    @PostMapping("/api/v1/flash-sales/reserve")
    ApiResponse<Void> reserveFlashSaleStock(@RequestBody FlashSaleReserveRequest request);

    /**
     * [Task ECOM-145 / ECOM-326] Đếm số lượng sản phẩm sắp hết hàng phục vụ thống kê Dashboard Admin.
     * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
     */
    @GetMapping("/api/v1/products/low-stock/count")
    ApiResponse<Long> countLowStockProducts(@RequestParam("threshold") int threshold);
}
