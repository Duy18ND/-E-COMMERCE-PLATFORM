package com.ecommerce.chatbot.client.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class OrderDto {

    private Long id;
    private Long userId;
    private String receiverName;
    private String receiverPhone;
    private String shippingAddress;
    private BigDecimal subtotalAmount;
    private String voucherCode;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
    private String status;
    private String paymentMethod;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<OrderItemDto> items;
    private List<OrderStatusHistoryDto> statusHistories;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OrderItemDto {
        private Long id;
        private Long productId;
        private String productName;
        private Integer quantity;
        @JsonAlias({"priceAtPurchase", "unitPrice"})
        private BigDecimal unitPrice;
        @JsonAlias({"subTotal", "subtotal"})
        private BigDecimal subtotal;

        public BigDecimal getSubtotal() {
            if (subtotal != null) {
                return subtotal;
            }
            if (unitPrice != null && quantity != null) {
                return unitPrice.multiply(BigDecimal.valueOf(quantity));
            }
            return null;
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OrderStatusHistoryDto {
        private Long id;
        private Long orderId;
        private String previousStatus;
        private String status;
        private String updatedBy;
        private String note;
        @JsonAlias({"createdAt", "updatedAt"})
        private LocalDateTime updatedAt;
    }
}

