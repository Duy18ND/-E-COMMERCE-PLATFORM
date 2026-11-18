package com.ecommerce.chatbot.client.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductStockDto {

    private Long productId;
    private String productName;
    private Integer stockQuantity;
    private Integer requestedQuantity;
    private String status;
    private boolean inStock;
    private boolean sufficientStock;
    private String stockStatusMessage;
}

