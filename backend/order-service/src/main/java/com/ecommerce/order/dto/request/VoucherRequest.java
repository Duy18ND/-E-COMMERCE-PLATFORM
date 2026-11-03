package com.ecommerce.order.dto.request;

import com.ecommerce.order.enums.DiscountType;
import com.ecommerce.order.enums.VoucherStatus;
import jakarta.validation.constraints.*;
import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoucherRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    @NotBlank(message = "Mã voucher không được để trống")
    @Size(min = 3, max = 50, message = "Mã voucher phải từ 3 đến 50 ký tự")
    @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Mã voucher chỉ được chứa chữ cái, chữ số, gạch ngang hoặc gạch dưới")
    private String code;

    @NotBlank(message = "Tên chương trình voucher không được để trống")
    @Size(max = 150, message = "Tên chương trình không được vượt quá 150 ký tự")
    private String name;

    @Size(max = 500, message = "Mô tả không được vượt quá 500 ký tự")
    private String description;

    @NotNull(message = "Loại giảm giá không được để trống")
    private DiscountType discountType;

    @NotNull(message = "Giá trị giảm không được để trống")
    @DecimalMin(value = "0.01", message = "Giá trị giảm phải lớn hơn 0")
    private BigDecimal discountValue;

    @DecimalMin(value = "0.01", message = "Mức giảm tối đa phải lớn hơn 0")
    private BigDecimal maxDiscount;

    @DecimalMin(value = "0.00", message = "Giá trị đơn hàng tối thiểu không được âm")
    private BigDecimal minOrderValue;

    @NotNull(message = "Số lượng giới hạn lượt dùng không được để trống")
    @Min(value = 1, message = "Số lượng mã phải lớn hơn 0")
    private Integer quantity;

    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDate startDate;

    @NotNull(message = "Ngày kết thúc không được để trống")
    private LocalDate endDate;

    private VoucherStatus status;

    @AssertTrue(message = "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu")
    public boolean isValidDateRange() {
        if (startDate == null || endDate == null) {
            return true;
        }
        return !endDate.isBefore(startDate);
    }

    @AssertTrue(message = "Phần trăm giảm giá không được vượt quá 100%")
    public boolean isValidPercentValue() {
        if (discountType == DiscountType.PERCENT && discountValue != null) {
            return discountValue.compareTo(new BigDecimal("100")) <= 0;
        }
        return true;
    }
}

