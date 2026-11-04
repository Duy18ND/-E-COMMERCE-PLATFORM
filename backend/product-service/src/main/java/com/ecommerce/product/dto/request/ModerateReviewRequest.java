package com.ecommerce.product.dto.request;

import com.ecommerce.product.enums.ReviewStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Request DTO dành cho Admin duyệt hoặc ẩn đánh giá vi phạm quy chuẩn.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModerateReviewRequest {

    @NotNull(message = "Trạng thái kiểm duyệt không được để trống")
    private ReviewStatus status;

    @Size(max = 255, message = "Lý do ẩn không được vượt quá 255 ký tự")
    private String reason;
}

