package com.ecommerce.chatbot.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "chat_conversations",
    indexes = {
        @Index(name = "idx_chat_conv_user_updated", columnList = "user_id, status, updated_at"),
        @Index(name = "idx_chat_conv_guest", columnList = "guest_session_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatConversation {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "guest_session_id", length = 64)
    private String guestSessionId;

    @Column(nullable = false, length = 200)
    @Builder.Default
    private String title = "Cuộc trò chuyện mới";

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}

