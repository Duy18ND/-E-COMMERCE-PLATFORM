package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.FlashSaleReserveRequest;
import com.ecommerce.product.dto.response.ApiResponse;
import com.ecommerce.product.exception.AccessDeniedException;
import com.ecommerce.product.service.FlashSaleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller exposing Flash Sale endpoints.
 *
 * <ul>
 *   <li><b>Admin</b> — initialise flash sale stock for a product.</li>
 *   <li><b>User / System</b> — atomically reserve stock (anti-overselling via Lua).</li>
 * </ul>
 *
 * <p>Role enforcement is performed at the controller level using the
 * {@code X-User-Roles} header forwarded by the API Gateway after JWT validation.
 * On failure, {@link com.ecommerce.product.exception.GlobalExceptionHandler} maps
 * thrown exceptions to the correct HTTP status codes.</p>
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class FlashSaleController {

    private final FlashSaleService flashSaleService;

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------

    /**
     * Opens a Flash Sale for a product by loading its available stock into Redis.
     *
     * <p>Requires {@code X-User-Roles} header to contain {@code ROLE_ADMIN}.
     * Missing header is caught by {@link com.ecommerce.product.exception.GlobalExceptionHandler}
     * and returned as {@code 400 Bad Request}.</p>
     *
     * @param productId the product to open for flash sale
     * @param stock     number of items available
     * @param userRoles roles string forwarded by the API Gateway
     * @return {@code 200 OK} with confirmation, or {@code 403 Forbidden} if not admin
     */
    @PostMapping("/api/v1/admin/flash-sales/products/{productId}")
    public ResponseEntity<ApiResponse<Void>> initFlashSale(
            @PathVariable Long productId,
            @RequestParam int stock,
            @RequestHeader("X-User-Roles") String userRoles) {

        if (!userRoles.contains("ROLE_ADMIN")) {
            throw new AccessDeniedException("Truy cập bị từ chối: yêu cầu quyền ROLE_ADMIN");
        }

        flashSaleService.initFlashSaleStock(productId, stock);

        log.info("[FlashSale] Admin opened flash sale — productId={}, stock={}", productId, stock);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Flash Sale đã được kích hoạt cho sản phẩm " + productId
                                + " với " + stock + " sản phẩm",
                        null));
    }

    // -----------------------------------------------------------------------
    // User / System
    // -----------------------------------------------------------------------

    /**
     * Atomically reserves Flash Sale stock for a user / downstream service.
     *
     * <p>On success returns {@code 200 OK}.
     * Failures are propagated as exceptions and handled by
     * {@link com.ecommerce.product.exception.GlobalExceptionHandler}:
     * <ul>
     *   <li>{@link com.ecommerce.product.exception.NotEnoughStockException}
     *       → {@code 409 Conflict}</li>
     *   <li>{@link com.ecommerce.product.exception.ResourceNotFoundException}
     *       → {@code 404 Not Found}</li>
     * </ul>
     *
     * @param request DTO containing {@code productId} and {@code quantity}
     * @return {@code 200 OK} with success message
     */
    @PostMapping("/api/v1/flash-sales/reserve")
    public ResponseEntity<ApiResponse<Void>> reserveFlashSaleStock(
            @Valid @RequestBody FlashSaleReserveRequest request) {

        flashSaleService.reserveFlashSaleStock(request.productId(), request.quantity());

        log.info("[FlashSale] Reserve OK — productId={}, qty={}", request.productId(), request.quantity());

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Đặt chỗ Flash Sale thành công! Sản phẩm "
                                + request.productId() + " x" + request.quantity(),
                        null));
    }
}

