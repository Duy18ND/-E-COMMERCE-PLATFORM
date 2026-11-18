package com.ecommerce.chatbot.dto.response;

import com.ecommerce.chatbot.client.dto.OrderDto;
import com.ecommerce.chatbot.client.dto.ProductDto;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationDetailResponse {

    private String id;
    private String title;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<MessageItemDto> messages = Collections.emptyList();

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MessageItemDto {
        private Long id;
        private String role;
        private String content;

        @Builder.Default
        private List<ProductDto> suggestedProducts = Collections.emptyList();

        @Builder.Default
        private List<ProductDto> products = Collections.emptyList();

        private OrderDto referencedOrder;
        private LocalDateTime createdAt;
    }
}

