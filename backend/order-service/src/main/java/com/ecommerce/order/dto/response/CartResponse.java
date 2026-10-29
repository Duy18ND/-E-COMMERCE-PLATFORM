package com.ecommerce.order.dto.response;

import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * [Task ECOM-117 / ECOM-119 / ECOM-259] DTO phản hồi thông tin giỏ hàng và tổng tiền tính từ phía Server.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Long userId;
    @Builder.Default
    private List<CartItemResponse> items = new ArrayList<>();
    private Integer totalItems;
    private BigDecimal totalAmount;

    /**
     * [Task ECOM-259] Hỗ trợ trả về thêm trường `totalPrice` tương thích trực tiếp với Frontend (CartContext.jsx)
     * mà vẫn giữ nguyên trường `totalAmount` của Backend.
     */
    public BigDecimal getTotalPrice() {
        return totalAmount != null ? totalAmount : BigDecimal.ZERO;
    }
}
