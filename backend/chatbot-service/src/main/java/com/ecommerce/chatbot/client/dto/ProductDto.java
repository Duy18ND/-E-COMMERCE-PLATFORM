package com.ecommerce.chatbot.client.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductDto {

    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer stockQuantity;
    private String category;
    private String imageUrl;
    private String image;
    private String productUrl;
    private String status;
    private Double averageRating;
    private Long totalReviews;
    private ActiveFlashSaleDto activeFlashSale;

    public String getImage() {
        return image != null ? image : imageUrl;
    }

    public String getProductUrl() {
        if (productUrl != null && !productUrl.isBlank()) {
            return productUrl;
        }
        return id != null ? "/products/" + id : "/products";
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ActiveFlashSaleDto {
        private Long campaignId;
        private String campaignName;
        private BigDecimal flashSalePrice;
        private Integer quantity;
        private Integer soldQuantity;
        private Integer remainingQuantity;
        private LocalDateTime startTime;
        private LocalDateTime endTime;
    }
}

