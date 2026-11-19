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
public class ChatMessageResponse {

    private String conversationId;
    private String title;
    private String reply;
    private String answer;

    @Builder.Default
    private List<ProductDto> suggestedProducts = Collections.emptyList();

    @Builder.Default
    private List<ProductDto> products = Collections.emptyList();

    private OrderDto referencedOrder;

    @Builder.Default
    private List<String> toolsUsed = Collections.emptyList();

    private LocalDateTime createdAt;

    public String getAnswer() {
        return answer != null ? answer : reply;
    }

    public String getReply() {
        return reply != null ? reply : answer;
    }

    public List<ProductDto> getProducts() {
        if (products != null && !products.isEmpty()) {
            return products;
        }
        return suggestedProducts != null ? suggestedProducts : Collections.emptyList();
    }

    public List<ProductDto> getSuggestedProducts() {
        if (suggestedProducts != null && !suggestedProducts.isEmpty()) {
            return suggestedProducts;
        }
        return products != null ? products : Collections.emptyList();
    }
}

