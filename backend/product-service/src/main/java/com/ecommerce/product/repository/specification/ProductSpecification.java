package com.ecommerce.product.repository.specification;

import com.ecommerce.product.dto.request.ProductFilterRequest;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.enums.ProductStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

public class ProductSpecification {

    /**
     * Xây dựng Specification động dựa trên ProductFilterRequest và tên category đã resolve (nếu có)
     *
     * @param filter tiêu chí lọc từ client
     * @param resolvedCategoryName tên danh mục được resolve từ categoryId (hoặc từ category text)
     * @return Specification<Product> cho Spring Data JPA
     */
    public static Specification<Product> filterBy(ProductFilterRequest filter, String resolvedCategoryName) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Chỉ lấy sản phẩm có trạng thái ACTIVE
            predicates.add(cb.equal(root.get("status"), ProductStatus.ACTIVE));

            if (filter == null) {
                return cb.and(predicates.toArray(new Predicate[0]));
            }

            // 2. Tìm kiếm theo từ khóa (khớp tên sản phẩm hoặc danh mục)
            if (StringUtils.hasText(filter.getKeyword())) {
                String pattern = "%" + filter.getKeyword().trim().toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("name")), pattern);
                Predicate catMatch = cb.like(cb.lower(root.get("category")), pattern);
                predicates.add(cb.or(nameMatch, catMatch));
            }

            // 3. Lọc theo danh mục cụ thể (từ resolvedCategoryName hoặc filter.getCategory())
            String targetCategory = StringUtils.hasText(resolvedCategoryName)
                    ? resolvedCategoryName
                    : filter.getCategory();

            if (StringUtils.hasText(targetCategory)) {
                predicates.add(cb.equal(cb.lower(root.get("category")), targetCategory.trim().toLowerCase()));
            }

            // 4. Lọc theo khoảng giá
            if (filter.getMinPrice() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), filter.getMinPrice()));
            }
            if (filter.getMaxPrice() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), filter.getMaxPrice()));
            }

            // 5. Lọc theo tồn kho (inStock = true nghĩa là stockQuantity > 0)
            if (Boolean.TRUE.equals(filter.getInStock())) {
                predicates.add(cb.greaterThan(root.get("stockQuantity"), 0));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
