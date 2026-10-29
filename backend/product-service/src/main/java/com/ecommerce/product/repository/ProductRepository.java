package com.ecommerce.product.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ecommerce.product.entity.Product;
import com.ecommerce.product.enums.ProductStatus;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

        Page<Product> findByStatus(ProductStatus status, Pageable pageable);

        Optional<Product> findByIdAndStatus(Long id, ProductStatus status);

        Page<Product> findByNameContainingIgnoreCaseOrCategoryContainingIgnoreCase(
                        String name, String category, Pageable pageable);

        @Query("SELECT p FROM Product p WHERE p.status = :status AND " +
                        "(:keyword IS NULL OR :keyword = '' OR " +
                        "LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                        "LOWER(p.category) LIKE LOWER(CONCAT('%', :keyword, '%')))")
        Page<Product> searchActiveProducts(
                        @Param("keyword") String keyword,
                        @Param("status") ProductStatus status,
                        Pageable pageable);

        /**
         * [Task ECOM-114 / ECOM-224 / ECOM-229] Truy vấn tìm kiếm sản phẩm theo từ khóa
         * mở rộng:
         * Tìm kiếm không phân biệt hoa thường (LOWER + LIKE) trên cả 3 trường:
         * - Tên sản phẩm (p.name)
         * - Tên danh mục (p.category)
         * - Mô tả sản phẩm (p.description)
         * Chỉ trả về các sản phẩm có trạng thái ACTIVE phục vụ khách vãng lai (Guest)
         * và người dùng.
         */
        @Query("SELECT p FROM Product p WHERE p.status = :status AND " +
                        "(:keyword IS NULL OR :keyword = '' OR " +
                        "LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                        "LOWER(p.category) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                        "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
        Page<Product> searchProductsByKeyword(
                        @Param("keyword") String keyword,
                        @Param("status") ProductStatus status,
                        Pageable pageable);

        /**
         * [Task ECOM-133 / ECOM-135] Truy vấn phân trang và tìm kiếm toàn bộ sản phẩm
         * dành cho Admin:
         * - Cho phép lọc theo trạng thái (status: ACTIVE, INACTIVE, OUT_OF_STOCK) hoặc
         * lấy tất cả nếu status = null.
         * - Cho phép tìm kiếm theo từ khóa (keyword) trên tên sản phẩm, danh mục hoặc
         * mô tả.
         */
        @Query("SELECT p FROM Product p WHERE " +
                        "(:status IS NULL OR p.status = :status) AND " +
                        "(:keyword IS NULL OR :keyword = '' OR " +
                        "LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                        "LOWER(p.category) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                        "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
        Page<Product> searchAllProductsForAdmin(
                        @Param("keyword") String keyword,
                        @Param("status") ProductStatus status,
                        Pageable pageable);
}
