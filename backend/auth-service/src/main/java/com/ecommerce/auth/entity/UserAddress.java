package com.ecommerce.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * S? ð?a ch? giao hàng c?a User.
 * M?i user có th? có nhi?u ð?a ch?, trong ðó ch? 1 ð?a ch? m?c ð?nh (isDefault = true).
 */
@Entity
@Table(
    name = "user_addresses",
    indexes = {
        @Index(name = "idx_address_user_id", columnList = "user_id")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAddress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "receiver_name", nullable = false, length = 150)
    private String receiverName;

    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    @Column(name = "address_line", nullable = false, length = 255)
    private String addressLine;

    @Column(name = "city", nullable = false, length = 100)
    private String city;

    @Column(name = "district", length = 100)
    private String district;

    @Column(name = "ward", length = 100)
    private String ward;

    /** Ð?a ch? m?c ð?nh. Ch? 1 ð?a ch? per user có th? là true. */
    @Builder.Default
    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
