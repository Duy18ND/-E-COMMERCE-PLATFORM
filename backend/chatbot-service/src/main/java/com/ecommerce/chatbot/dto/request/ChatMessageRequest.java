package com.ecommerce.chatbot.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageRequest {

    @Size(max = 36, message = "Mã hội thoại không hợp lệ")
    private String conversationId;

    @Size(max = 1000, message = "Nội dung câu hỏi không được vượt quá 1000 ký tự")
    private String message;

    @Size(max = 1000, message = "Nội dung câu hỏi không được vượt quá 1000 ký tự")
    private String question;

    public String getEffectiveMessage() {
        if (question != null && !question.trim().isEmpty()) {
            return question.trim();
        }
        return message != null ? message.trim() : "";
    }

    @AssertTrue(message = "Nội dung câu hỏi không được để trống")
    public boolean isValidMessageOrQuestion() {
        return !getEffectiveMessage().isEmpty();
    }
}

