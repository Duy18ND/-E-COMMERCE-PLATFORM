package com.ecommerce.product.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * [Task ECOM-130 / ECOM-132 / ECOM-238 / ECOM-239] DTO nhận dữ liệu đầu vào khi
 * Admin
 * Thêm mới (Create) hoặc Cập nhật (Update) danh mục sản phẩm.
 * Tích hợp Jakarta Validation để kiểm tra dữ liệu hợp lệ trước khi xử lý nghiệp
 * vụ.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryRequest {

    // [Task ECOM-239] Tên danh mục bắt buộc nhập, không chỉ chứa khoảng trắng và
    // tối đa 100 ký tự
    @NotBlank(message = "Tên danh mục không được để trống")
    @Size(max = 100, message = "Tên danh mục không được vượt quá 100 ký tự")
    private String name;

    // Mô tả danh mục tối đa 255 ký tự (khớp với độ dài cột description trong bảng
    // categories)
    @Size(max = 255, message = "Mô tả danh mục không được vượt quá 255 ký tự")
    private String description;

    // Đường dẫn ảnh đại diện của danh mục tối đa 500 ký tự
    @Size(max = 500, message = "Đường dẫn hình ảnh không được vượt quá 500 ký tự")
    private String imageUrl;
}