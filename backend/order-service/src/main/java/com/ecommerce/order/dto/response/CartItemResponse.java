package com.ecommerce.order.dto.response;

import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;

/**
 * [Task ECOM-117 / ECOM-119 / ECOM-259] DTO phản hồi chi tiết từng mặt hàng trong giỏ
 * kèm tồn kho hiện tại (`stockAvailable`) và thành tiền tạm tính (`subTotal`) được tính ở phía Server.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartItemResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Long productId;
    private String productName;
    private BigDecimal price;
    private Integer quantity;
    private BigDecimal subTotal;
    private String imageUrl;
    private Integer stockAvailable;

    /**
     * [Task ECOM-258 / ECOM-259] Các getter bổ trợ giúp Frontend (CartContext.jsx / CartItem.jsx)
     * đọc được cả `itemId`, `name` và `unitPrice` đồng bộ với dữ liệu từ Server.
     */
    public Long getItemId() {
        return id;
    }

    public String getName() {
        return productName;
    }

    public BigDecimal getUnitPrice() {
        return price;
    }
}
