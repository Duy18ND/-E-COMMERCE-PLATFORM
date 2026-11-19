package com.ecommerce.chatbot.client.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewSummaryDto {
    private Double averageRating;
    private Long totalReviews;
}

