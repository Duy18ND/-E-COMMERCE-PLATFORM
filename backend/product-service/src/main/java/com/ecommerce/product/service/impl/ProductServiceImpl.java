package com.ecommerce.product.service.impl;

import com.ecommerce.product.dto.request.ProductCreateRequest;
import com.ecommerce.product.dto.request.ProductUpdateRequest;
import com.ecommerce.product.dto.request.StockReservationItem;
import com.ecommerce.product.dto.response.PagedResponse;
import com.ecommerce.product.dto.response.ProductResponse;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.enums.ProductStatus;
import com.ecommerce.product.exception.NotEnoughStockException;
import com.ecommerce.product.exception.ResourceNotFoundException;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.service.ProductService;
import jakarta.persistence.OptimisticLockException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "products", key = "#pageable.pageNumber + '-' + #pageable.pageSize", unless = "#keyword != null && !#keyword.isBlank()")
    public PagedResponse<ProductResponse> getProducts(String keyword, Pageable pageable) {
        Page<Product> page;
        if (StringUtils.hasText(keyword)) {
            page = productRepository.searchActiveProducts(keyword.trim(), ProductStatus.ACTIVE, pageable);
        } else {
            page = productRepository.findByStatus(ProductStatus.ACTIVE, pageable);
        }

        Page<ProductResponse> dtoPage = page.map(ProductResponse::fromEntity);
        return PagedResponse.fromPage(dtoPage);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + id));

        return ProductResponse.fromEntity(product);
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public ProductResponse createProduct(ProductCreateRequest request) {
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
        log.info("Created new product with ID: {}", savedProduct.getId());
        return ProductResponse.fromEntity(savedProduct);
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public ProductResponse updateProduct(Long id, ProductUpdateRequest request) {
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
        log.info("Updated product ID: {}", updatedProduct.getId());
        return ProductResponse.fromEntity(updatedProduct);
    }

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
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + item.getProductId()));

                if (product.getStatus() != ProductStatus.ACTIVE) {
                    throw new NotEnoughStockException("Sản phẩm '" + product.getName() + "' (ID: " + product.getId() + ") hiện không khả dụng");
                }

                if (product.getStockQuantity() < item.getQuantity()) {
                    throw new NotEnoughStockException("Sản phẩm '" + product.getName() + "' không đủ số lượng tồn kho (Còn lại: "
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
            throw new NotEnoughStockException("Xảy ra xung đột cập nhật tồn kho đồng thời (Optimistic Lock). Vui lòng thử lại!");
        } catch (OptimisticLockException ex) {
            log.error("JPA Optimistic locking conflict during stock reservation: {}", ex.getMessage());
            throw new NotEnoughStockException("Xảy ra xung đột cập nhật tồn kho đồng thời (Optimistic Lock). Vui lòng thử lại!");
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
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + item.getProductId()));

            product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
            productRepository.save(product);
            log.info("Restored stock for product ID: {}, added: {}, new total: {}",
                    product.getId(), item.getQuantity(), product.getStockQuantity());
        }
    }
}
