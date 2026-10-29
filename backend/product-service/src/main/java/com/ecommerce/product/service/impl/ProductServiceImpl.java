package com.ecommerce.product.service.impl;

import java.util.List;

import jakarta.persistence.OptimisticLockException;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.ecommerce.product.dto.request.CategoryRequest;
import com.ecommerce.product.dto.request.ProductCreateRequest;
import com.ecommerce.product.dto.request.ProductFilterRequest;
import com.ecommerce.product.dto.request.ProductUpdateRequest;
import com.ecommerce.product.dto.request.StockReservationItem;
import com.ecommerce.product.dto.response.CategoryResponse;
import com.ecommerce.product.dto.response.PagedResponse;
import com.ecommerce.product.dto.response.ProductResponse;
import com.ecommerce.product.dto.response.ProductStockResponse;
import com.ecommerce.product.entity.Category;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.enums.ProductStatus;
import com.ecommerce.product.exception.DuplicateResourceException;
import com.ecommerce.product.exception.NotEnoughStockException;
import com.ecommerce.product.exception.ResourceNotFoundException;
import com.ecommerce.product.repository.CategoryRepository;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.repository.specification.ProductSpecification;
import com.ecommerce.product.service.ProductService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    /**
     * [Task ECOM-108 / ECOM-212] Xử lý nghiệp vụ lấy danh sách sản phẩm phân trang
     * công khai.
     */
    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "products", key = "'page:' + #pageable.pageNumber + ':size:' + #pageable.pageSize + ':sort:' + #pageable.sort.toString()", condition = "#filterRequest == null || !#filterRequest.hasFilters()")
    public PagedResponse<ProductResponse> getProducts(ProductFilterRequest filterRequest, Pageable pageable) {
        if (filterRequest != null && filterRequest.getMinPrice() != null && filterRequest.getMaxPrice() != null) {
            if (filterRequest.getMinPrice().compareTo(filterRequest.getMaxPrice()) > 0) {
                throw new IllegalArgumentException("Giá tối thiểu (minPrice) không được lớn hơn giá tối đa (maxPrice)");
            }
        }

        // Resolve category name if categoryId is provided
        String resolvedCategoryName = null;
        if (filterRequest != null && filterRequest.getCategoryId() != null) {
            resolvedCategoryName = categoryRepository.findById(filterRequest.getCategoryId())
                    .map(com.ecommerce.product.entity.Category::getName)
                    .orElse(null);
        }

        Specification<Product> spec = ProductSpecification.filterBy(filterRequest, resolvedCategoryName);
        Page<Product> page = productRepository.findAll(spec, pageable);

        Page<ProductResponse> dtoPage = page.map(ProductResponse::fromEntity);
        return PagedResponse.fromPage(dtoPage);
    }

    /**
     * [Task ECOM-111 / ECOM-112 / ECOM-220] Lấy thông tin chi tiết một sản phẩm
     * theo ID
     * kèm số lượng tồn kho (stockQuantity) và trạng thái sản phẩm (status).
     * Nếu không tìm thấy sản phẩm sẽ ném ResourceNotFoundException (HTTP 404).
     */
    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ProductResponse> getProducts(String keyword, Pageable pageable) {
        return getProducts(ProductFilterRequest.builder().keyword(keyword).build(), pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));

        return ProductResponse.fromEntity(product);
    }

    /**
     * [Task ECOM-133 / ECOM-135 / ECOM-248] Thêm mới sản phẩm dành cho Admin:
     * - Kiểm tra hợp lệ giá sản phẩm (> 0) và số lượng tồn kho khởi tạo (>= 0).
     * - Tự động khởi tạo dữ liệu tồn kho (stockQuantity) và trạng thái sản phẩm
     * (ACTIVE).
     * - Xóa cache danh sách sản phẩm trên Redis để đồng bộ dữ liệu mới nhất.
     */
    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public ProductResponse createProduct(ProductCreateRequest request) {
        validatePriceAndStock(request.getPrice(), request.getStockQuantity());
        Product product = Product.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .price(request.getPrice())
                .stockQuantity(request.getStockQuantity())
                .category(request.getCategory())
                .imageUrl(request.getImageUrl())
                .status(ProductStatus.ACTIVE)
                .build();
        Product savedProduct = productRepository.save(product);
        log.info("Created new product with ID: {}, initial stock: {}", savedProduct.getId(),
                savedProduct.getStockQuantity());
        return ProductResponse.fromEntity(savedProduct);
    }

    /**
     * [Task ECOM-133 / ECOM-135 / ECOM-248] Cập nhật thông tin và số lượng tồn kho
     * sản phẩm cho Admin:
     * - Kiểm tra sản phẩm tồn tại theo ID (ném 404 nếu không thấy).
     * - Kiểm tra hợp lệ giá sản phẩm (> 0) và số lượng tồn kho (>= 0).
     * - Cập nhật thông tin sản phẩm, số lượng tồn kho và trạng thái (nếu có).
     */
    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public ProductResponse updateProduct(Long id, ProductUpdateRequest request) {
        validatePriceAndStock(request.getPrice(), request.getStockQuantity());
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));
        product.setName(request.getName().trim());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setStockQuantity(request.getStockQuantity());
        product.setCategory(request.getCategory());
        product.setImageUrl(request.getImageUrl());
        if (request.getStatus() != null) {
            product.setStatus(request.getStatus());
        }
        Product updatedProduct = productRepository.save(product);
        log.info("Updated product ID: {}, stock: {}", updatedProduct.getId(), updatedProduct.getStockQuantity());
        return ProductResponse.fromEntity(updatedProduct);
    }

    /**
     * [Task ECOM-133 / ECOM-135] Xóa mềm sản phẩm dành cho Admin:
     * Chuyển trạng thái sản phẩm sang INACTIVE thay vì xóa cứng khỏi CSDL
     * để đảm bảo toàn vẹn lịch sử đơn hàng.
     */
    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));
        product.setStatus(ProductStatus.INACTIVE);
        productRepository.save(product);
        log.info("Soft deleted (set INACTIVE) product ID: {}", id);
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public void reserveStock(List<StockReservationItem> items) {
        if (items == null || items.isEmpty()) {
            return;
        }

        try {
            for (StockReservationItem item : items) {
                Product product = productRepository.findById(item.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Không tìm thấy sản phẩm với ID: " + item.getProductId()));

                if (product.getStatus() != ProductStatus.ACTIVE) {
                    throw new NotEnoughStockException(
                            "Sản phẩm '" + product.getName() + "' (ID: " + product.getId() + ") hiện không khả dụng");
                }

                if (product.getStockQuantity() < item.getQuantity()) {
                    throw new NotEnoughStockException(
                            "Sản phẩm '" + product.getName() + "' không đủ số lượng tồn kho (Còn lại: "
                                    + product.getStockQuantity() + ", yêu cầu: " + item.getQuantity() + ")");
                }

                product.setStockQuantity(product.getStockQuantity() - item.getQuantity());
                // Save and flush to trigger JPA optimistic lock check (@Version) immediately
                productRepository.saveAndFlush(product);
                log.info("Reserved stock for product ID: {}, reserved: {}, remaining: {}",
                        product.getId(), item.getQuantity(), product.getStockQuantity());
            }
        } catch (ObjectOptimisticLockingFailureException ex) {
            log.error("Optimistic locking conflict during stock reservation: {}", ex.getMessage());
            throw new NotEnoughStockException(
                    "Xảy ra xung đột cập nhật tồn kho đồng thời (Optimistic Lock). Vui lòng thử lại!");
        } catch (OptimisticLockException ex) {
            log.error("JPA Optimistic locking conflict during stock reservation: {}", ex.getMessage());
            throw new NotEnoughStockException(
                    "Xảy ra xung đột cập nhật tồn kho đồng thời (Optimistic Lock). Vui lòng thử lại!");
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public void restoreStock(List<StockReservationItem> items) {
        if (items == null || items.isEmpty()) {
            return;
        }

        for (StockReservationItem item : items) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Không tìm thấy sản phẩm với ID: " + item.getProductId()));

            product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
            productRepository.save(product);
            log.info("Restored stock for product ID: {}, added: {}, new total: {}",
                    product.getId(), item.getQuantity(), product.getStockQuantity());
        }
    }

    /**
     * [Task ECOM-108 / ECOM-211] Lấy toàn bộ danh mục sản phẩm từ bảng categories
     * và chuyển đổi sang CategoryResponse DTO phục vụ API công khai cho Guest.
     */
    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getCategories() {
        return categoryRepository.findAll().stream()
                .map(CategoryResponse::fromEntity)
                .toList();
    }

    /**
     * [Task ECOM-111 / ECOM-112 / ECOM-221] Kiểm tra tồn kho theo mã sản phẩm (id).
     * - Tìm sản phẩm trong DB theo ID (ném 404 nếu không tồn tại).
     * - Nếu số lượng yêu cầu (quantity) <= 0 hoặc null thì mặc định kiểm tra với số
     * lượng = 1.
     * - Trả về DTO chứa số lượng tồn kho, trạng thái còn hàng (inStock) và đủ hàng
     * (sufficientStock).
     */
    @Override
    @Transactional(readOnly = true)
    public ProductStockResponse checkProductStock(Long id, Integer quantity) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));
        int requestedQty = (quantity != null && quantity > 0) ? quantity : 1;
        return ProductStockResponse.fromEntity(product, requestedQty);
    }

    /**
     * [Task ECOM-114 / ECOM-224 / ECOM-229] Xử lý logic tìm kiếm sản phẩm theo từ
     * khóa (keyword).
     * - Cắt khoảng trắng thừa ở 2 đầu từ khóa (trim).
     * - Nếu từ khóa rỗng hoặc null: trả về danh sách sản phẩm ACTIVE mặc định theo
     * phân trang.
     * - Nếu có từ khóa: tìm kiếm không phân biệt hoa thường trong tên, danh mục và
     * mô tả sản phẩm.
     */
    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ProductResponse> searchProducts(String keyword, Pageable pageable) {
        Page<Product> page;
        if (StringUtils.hasText(keyword)) {
            String cleanKeyword = keyword.trim();
            log.debug("Searching active products with keyword: '{}'", cleanKeyword);
            page = productRepository.searchProductsByKeyword(cleanKeyword, ProductStatus.ACTIVE, pageable);
        } else {
            page = productRepository.findByStatus(ProductStatus.ACTIVE, pageable);
        }
        Page<ProductResponse> dtoPage = page.map(ProductResponse::fromEntity);
        return PagedResponse.fromPage(dtoPage);
    }

    /**
     * [Task ECOM-132 / ECOM-238] Tìm kiếm danh mục sản phẩm theo từ khóa (keyword).
     * Nếu không truyền keyword thì trả về toàn bộ danh mục.
     */
    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> searchCategories(String keyword) {
        List<Category> categories;
        if (StringUtils.hasText(keyword)) {
            categories = categoryRepository.searchCategoriesByKeyword(keyword.trim());
        } else {
            categories = categoryRepository.findAll();
        }
        return categories.stream()
                .map(CategoryResponse::fromEntity)
                .toList();
    }

    /**
     * [Task ECOM-238] Lấy thông tin chi tiết một danh mục theo ID.
     * Ném ResourceNotFoundException (HTTP 404) nếu không tìm thấy.
     */
    @Override
    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));
        return CategoryResponse.fromEntity(category);
    }

    /**
     * [Task ECOM-132 / ECOM-238 / ECOM-239] Thêm mới một danh mục sản phẩm.
     * Kiểm tra trùng tên danh mục (không phân biệt hoa thường); nếu trùng sẽ ném
     * DuplicateResourceException (HTTP 409).
     */
    @Override
    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        String trimmedName = request.getName().trim();
        if (categoryRepository.existsByNameIgnoreCase(trimmedName)) {
            throw new DuplicateResourceException("Tên danh mục '" + trimmedName + "' đã tồn tại trong hệ thống");
        }
        Category category = Category.builder()
                .name(trimmedName)
                .description(request.getDescription())
                .imageUrl(request.getImageUrl())
                .build();
        Category savedCategory = categoryRepository.save(category);
        log.info("Created new category with ID: {}, name: {}", savedCategory.getId(), savedCategory.getName());
        return CategoryResponse.fromEntity(savedCategory);
    }

    /**
     * [Task ECOM-132 / ECOM-238 / ECOM-239] Cập nhật thông tin danh mục theo ID.
     * Kiểm tra danh mục tồn tại (404) và kiểm tra tên mới không trùng với danh mục
     * khác (409).
     */
    @Override
    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));
        String trimmedName = request.getName().trim();
        // Nếu đổi sang tên mới thì kiểm tra xem tên mới đã tồn tại ở danh mục khác chưa
        if (!category.getName().equalsIgnoreCase(trimmedName)
                && categoryRepository.existsByNameIgnoreCase(trimmedName)) {
            throw new DuplicateResourceException("Tên danh mục '" + trimmedName + "' đã tồn tại trong hệ thống");
        }
        category.setName(trimmedName);
        category.setDescription(request.getDescription());
        category.setImageUrl(request.getImageUrl());
        Category updatedCategory = categoryRepository.save(category);
        log.info("Updated category ID: {}", updatedCategory.getId());
        return CategoryResponse.fromEntity(updatedCategory);
    }

    /**
     * [Task ECOM-132 / ECOM-238] Xóa danh mục sản phẩm theo ID.
     * Kiểm tra danh mục tồn tại trước khi xóa; nếu không có ném
     * ResourceNotFoundException (HTTP 404).
     * Ràng buộc toàn vẹn: nếu vẫn còn sản phẩm thuộc danh mục thì ném
     * IllegalStateException (HTTP 422) và không cho phép xóa.
     */
    @Override
    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));
        if (productRepository.existsByCategoryIgnoreCase(category.getName())) {
            long productCount = productRepository.countByCategoryIgnoreCase(category.getName());
            throw new IllegalStateException("Không thể xóa danh mục '" + category.getName()
                    + "' vì vẫn còn " + productCount + " sản phẩm thuộc danh mục này");
        }
        categoryRepository.delete(category);
        log.info("Deleted category ID: {}", id);
    }

    /**
     * [Task ECOM-133 / ECOM-135] Lấy danh sách toàn bộ sản phẩm có phân trang dành
     * cho Admin.
     * Hỗ trợ tìm kiếm theo từ khóa (keyword) và lọc theo trạng thái (ACTIVE,
     * INACTIVE, OUT_OF_STOCK).
     */
    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ProductResponse> getAdminProducts(String keyword, ProductStatus status, Pageable pageable) {
        String cleanKeyword = StringUtils.hasText(keyword) ? keyword.trim() : null;
        Page<Product> page = productRepository.searchAllProductsForAdmin(cleanKeyword, status, pageable);
        Page<ProductResponse> dtoPage = page.map(ProductResponse::fromEntity);
        return PagedResponse.fromPage(dtoPage);
    }

    /**
     * [Task ECOM-248] Hàm helper kiểm tra hợp lệ giá sản phẩm (> 0) và số lượng tồn
     * kho (>= 0)
     * ở tầng nghiệp vụ (Service layer) nhằm đảm bảo an toàn dữ liệu tuyệt đối.
     */
    private void validatePriceAndStock(java.math.BigDecimal price, Integer stockQuantity) {
        if (price == null || price.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Giá sản phẩm phải lớn hơn 0");
        }
        if (stockQuantity == null || stockQuantity < 0) {
            throw new IllegalArgumentException("Số lượng tồn kho không được nhỏ hơn 0");
        }
    }
}
