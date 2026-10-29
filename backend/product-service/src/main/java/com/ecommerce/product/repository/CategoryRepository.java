package com.ecommerce.product.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ecommerce.product.entity.Category;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findByName(String name);

    boolean existsByName(String name);

    /**
     * [Task ECOM-238 / ECOM-239] Kiểm tra tên danh mục đã tồn tại hay chưa (không
     * phân biệt hoa thường).
     */
    boolean existsByNameIgnoreCase(String name);

    /**
     * [Task ECOM-132 / ECOM-238] Tìm kiếm danh mục theo từ khóa (khớp tên hoặc mô
     * tả danh mục).
     */
    @Query("SELECT c FROM Category c WHERE " +
            "(:keyword IS NULL OR :keyword = '' OR " +
            "LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(c.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Category> searchCategoriesByKeyword(@Param("keyword") String keyword);
}
