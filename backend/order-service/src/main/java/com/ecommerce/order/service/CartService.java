package com.ecommerce.order.service;

import com.ecommerce.order.dto.request.AddToCartRequest;
import com.ecommerce.order.dto.request.UpdateCartItemRequest;
import com.ecommerce.order.dto.response.CartResponse;

public interface CartService {

    /**
     * Lấy giỏ hàng của người dùng hiện tại (kèm thông tin chi tiết sản phẩm, giá mới nhất, tổng tiền).
     */
    CartResponse getCart(Long userId);

    /**
     * Thêm sản phẩm vào giỏ hàng:
     * Kiểm tra tồn kho qua ProductClient Feign trước khi thêm. Nếu vượt quá tồn kho ném NotEnoughStockException.
     */
    CartResponse addToCart(Long userId, AddToCartRequest request);

    /**
     * Cập nhật số lượng sản phẩm trong giỏ:
     * Kiểm tra quyền sở hữu item và kiểm tra tồn kho mới.
     */
    CartResponse updateCartItem(Long userId, Long itemId, UpdateCartItemRequest request);

    /**
     * Xóa sản phẩm khỏi giỏ hàng.
     */
    CartResponse removeCartItem(Long userId, Long itemId);

    /**
     * Xóa toàn bộ sản phẩm trong giỏ hàng.
     */
    void clearCart(Long userId);
}
