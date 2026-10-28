package com.ecommerce.auth.dto.response;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

/**
 * Response DTO tr? v? thông tin m?t ð?a ch? trong s? ð?a ch?.
 */
@Getter
@Builder
public class AddressResponse {
    private Long id;
    private Long userId;
    private String receiverName;
    private String phone;
    private String addressLine;
    private String city;
    private String district;
    private String ward;
    private Boolean isDefault;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
