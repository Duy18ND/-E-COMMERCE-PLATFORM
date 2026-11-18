package com.ecommerce.chatbot.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationSummaryResponse {
    private String id;
    private String title;
    private String lastMessagePreview;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

