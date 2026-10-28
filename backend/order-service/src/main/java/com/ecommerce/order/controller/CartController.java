package com.ecommerce.order.controller;

import com.ecommerce.order.dto.request.AddToCartRequest;
import com.ecommerce.order.dto.request.UpdateCartItemRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.CartResponse;
import com.ecommerce.order.exception.AccessDeniedException;
import com.ecommerce.order.service.CartService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/cart")
@RequiredArgsConstructor
@Tag(name = "Cart Controller", description = "Quản lý giỏ hàng: xem giỏ, thêm sản phẩm, cập nhật số lượng và xóa sản phẩm")
public class CartController {

    private final CartService cartService;

    @GetMapping
    @Operation(summary = "Xem giỏ hàng", description = "Lấy toàn bộ sản phẩm trong giỏ hàng của user đang đăng nhập")
    public ResponseEntity<ApiResponse<CartResponse>> getCart(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId) {

        validateAuthenticatedUser(authenticatedUserId);
        CartResponse response = cartService.getCart(authenticatedUserId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin giỏ hàng thành công", response));
    }

    @PostMapping("/items")
    @Operation(summary = "Thêm sản phẩm vào giỏ hàng", description = "Kiểm tra tồn kho qua Product Service trước khi thêm, cộng dồn số lượng nếu đã có")
    public ResponseEntity<ApiResponse<CartResponse>> addToCart(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId,
            @Valid @RequestBody AddToCartRequest request) {

        validateAuthenticatedUser(authenticatedUserId);
        CartResponse response = cartService.addToCart(authenticatedUserId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Thêm sản phẩm vào giỏ hàng thành công", response));
    }

    @PutMapping("/items/{itemId}")
    @Operation(summary = "Cập nhật số lượng sản phẩm trong giỏ", description = "Cập nhật số lượng của một item trong giỏ, kiểm tra tồn kho mới")
    public ResponseEntity<ApiResponse<CartResponse>> updateCartItem(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId,
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateCartItemRequest request) {

        validateAuthenticatedUser(authenticatedUserId);
        CartResponse response = cartService.updateCartItem(authenticatedUserId, itemId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật giỏ hàng thành công", response));
    }

    @DeleteMapping("/items/{itemId}")
    @Operation(summary = "Xóa sản phẩm khỏi giỏ hàng", description = "Xóa một sản phẩm cụ thể khỏi giỏ hàng")
    public ResponseEntity<ApiResponse<CartResponse>> removeCartItem(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId,
            @PathVariable Long itemId) {

        validateAuthenticatedUser(authenticatedUserId);
        CartResponse response = cartService.removeCartItem(authenticatedUserId, itemId);
        return ResponseEntity.ok(ApiResponse.success("Xóa sản phẩm khỏi giỏ hàng thành công", response));
    }

    @DeleteMapping
    @Operation(summary = "Xóa toàn bộ giỏ hàng", description = "Xóa rỗng giỏ hàng sau khi đặt hàng hoặc người dùng chủ động xóa")
    public ResponseEntity<ApiResponse<Void>> clearCart(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId) {

        validateAuthenticatedUser(authenticatedUserId);
        cartService.clearCart(authenticatedUserId);
        return ResponseEntity.ok(ApiResponse.success("Xóa toàn bộ giỏ hàng thành công", null));
    }

    private void validateAuthenticatedUser(Long userId) {
        if (userId == null) {
            throw new AccessDeniedException("Vui lòng đăng nhập để thao tác với giỏ hàng (Thiếu X-User-Id)");
        }
    }
}
