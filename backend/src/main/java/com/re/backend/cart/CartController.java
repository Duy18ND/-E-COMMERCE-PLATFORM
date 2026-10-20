package com.re.backend.cart;

import com.re.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    /**
     * GET /api/cart
     * Lấy giỏ hàng hiện tại (tự tạo mới nếu chưa có).
     */
    @GetMapping
    public ResponseEntity<ApiResponse<CartResponse>> getCart(
            @AuthenticationPrincipal UserDetails userDetails) {
        CartResponse cart = cartService.getCartByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(cart));
    }

    /**
     * POST /api/cart/items
     * Thêm sản phẩm vào giỏ (cộng dồn nếu đã có, kiểm tra tồn kho).
     */
    @PostMapping("/items")
    public ResponseEntity<ApiResponse<CartResponse>> addItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AddToCartRequest request) {
        CartResponse cart = cartService.addItem(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Đã thêm sản phẩm vào giỏ hàng", cart));
    }

    /**
     * PUT /api/cart/items/{itemId}
     * Cập nhật số lượng (quantity <= 0 thì tự xóa item).
     */
    @PutMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<CartResponse>> updateItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateCartItemRequest request) {
        CartResponse cart = cartService.updateItem(userDetails.getUsername(), itemId, request);
        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật giỏ hàng", cart));
    }

    /**
     * DELETE /api/cart/items/{itemId}
     * Xóa một mục khỏi giỏ hàng.
     */
    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<CartResponse>> removeItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long itemId) {
        CartResponse cart = cartService.removeItem(userDetails.getUsername(), itemId);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa sản phẩm khỏi giỏ hàng", cart));
    }

    /**
     * DELETE /api/cart/clear
     * Làm trống toàn bộ giỏ hàng.
     */
    @DeleteMapping("/clear")
    public ResponseEntity<ApiResponse<CartResponse>> clearCart(
            @AuthenticationPrincipal UserDetails userDetails) {
        CartResponse cart = cartService.clearCart(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Đã xóa toàn bộ giỏ hàng", cart));
    }
}
