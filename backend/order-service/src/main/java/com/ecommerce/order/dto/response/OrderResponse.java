package com.ecommerce.order.dto.response;

import com.ecommerce.order.enums.OrderStatus;
import com.ecommerce.order.enums.PaymentMethod;
import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Long userId;
    private String receiverName;
    private String receiverPhone;
    private String shippingAddress;
    private BigDecimal subtotalAmount;
    private String voucherCode;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
    private OrderStatus status;
    private PaymentMethod paymentMethod;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<OrderItemResponse> items;
    /**
     * [Task ECOM-171 / ECOM-315] Lịch sử tiến trình trạng thái đơn hàng (Timeline).
     */
    private List<OrderStatusHistoryResponse> statusHistories;
}
