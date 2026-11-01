package com.ecommerce.product.client;

import com.ecommerce.product.client.dto.OrderDetailResponse;
import com.ecommerce.product.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

/**
 * Feign Client gọi sang Order Service để xác minh đơn hàng trước khi cho phép đánh giá sản phẩm.
 * Sử dụng service name "order-service" để đăng ký trên Eureka.
 */
@FeignClient(name = "order-service", path = "/api/v1/orders")
public interface OrderClient {

    /**
     * Lấy chi tiết đơn hàng theo ID.
     * Được dùng để kiểm tra: đơn hàng có status DELIVERED không và có chứa productId không.
     * <p>
     * Order Service bắt buộc header X-User-Id và chỉ trả về đơn hàng thuộc về user đó (chống IDOR),
     * nên phải propagate userId của người đang tạo review. Nếu đơn không thuộc user → HTTP 403.
     *
     * @param id     ID đơn hàng
     * @param userId ID người dùng đang thao tác (propagate từ header X-User-Id của request gốc)
     * @return ApiResponse chứa OrderDetailResponse
     */
    @GetMapping("/{id}")
    ApiResponse<OrderDetailResponse> getOrderById(@PathVariable("id") Long id,
                                                  @RequestHeader("X-User-Id") Long userId);
}