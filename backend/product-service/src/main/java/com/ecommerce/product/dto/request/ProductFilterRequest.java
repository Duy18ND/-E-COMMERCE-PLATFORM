package com.ecommerce.product.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductFilterRequest {

    /**
     * Từ khóa tìm kiếm theo tên hoặc danh mục sản phẩm
     */
    private String keyword;

    /**
     * ID danh mục sản phẩm cần lọc
     */
    private Long categoryId;

    /**
     * Tên danh mục sản phẩm cần lọc (hỗ trợ thêm query param dạng text)
     */
    private String category;

    /**
     * Khoảng giá tối thiểu (>= 0.0)
     */
    @DecimalMin(value = "0.0", message = "Giá tối thiểu (minPrice) không được nhỏ hơn 0")
    private BigDecimal minPrice;

    /**
     * Khoảng giá tối đa (>= 0.0)
     */
    @DecimalMin(value = "0.0", message = "Giá tối đa (maxPrice) không được nhỏ hơn 0")
    private BigDecimal maxPrice;

    /**
     * true: chỉ lấy sản phẩm còn hàng trong kho (stockQuantity > 0)
     * false hoặc null: lấy tất cả
     */
    private Boolean inStock;

    /**
     * Custom validation đảm bảo minPrice <= maxPrice nếu cả hai đều có giá trị
     */
    @AssertTrue(message = "Giá tối thiểu (minPrice) không được lớn hơn giá tối đa (maxPrice)")
    public boolean isPriceRangeValid() {
        if (minPrice != null && maxPrice != null) {
            return minPrice.compareTo(maxPrice) <= 0;
        }
        return true;
    }

    /**
     * Kiểm tra xem request có chứa bất kỳ tiêu chí lọc nào không.
     * Dùng để quyết định có bypass Redis Cache hay không.
     */
    public boolean hasFilters() {
        return (keyword != null && !keyword.isBlank())
                || categoryId != null
                || (category != null && !category.isBlank())
                || minPrice != null
                || maxPrice != null
                || (inStock != null && inStock);
    }
}
