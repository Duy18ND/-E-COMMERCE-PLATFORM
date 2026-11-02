package com.ecommerce.product.dto.request;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateFlashSaleCampaignRequest {

    @NotBlank(message = "Tên chiến dịch Flash Sale không được để trống")
    @Size(max = 200, message = "Tên chiến dịch không được vượt quá 200 ký tự")
    private String name;

    @NotNull(message = "Thời gian bắt đầu không được để trống")
    private LocalDateTime startTime;

    @NotNull(message = "Thời gian kết thúc không được để trống")
    private LocalDateTime endTime;

    @NotEmpty(message = "Chiến dịch phải có ít nhất 1 sản phẩm tham gia")
    private List<@Valid FlashSaleItemRequest> items;

    @JsonIgnore
    @AssertTrue(message = "Thời gian kết thúc phải sau thời gian bắt đầu")
    public boolean isValidTimeRange() {
        return endTime != null && startTime != null && endTime.isAfter(startTime);
    }
}

