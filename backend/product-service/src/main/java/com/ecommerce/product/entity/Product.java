package com.ecommerce.product.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.ecommerce.product.enums.ProductStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "products", indexes = {
                @Index(name = "idx_products_name", columnList = "name"),
                @Index(name = "idx_products_category", columnList = "category"),
                @Index(name = "idx_products_status", columnList = "status"),
                @Index(name = "idx_products_status_price", columnList = "status, price"),
                @Index(name = "idx_products_status_category", columnList = "status, category")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Column(nullable = false, length = 200)
        private String name;

        @Column(columnDefinition = "TEXT")
        private String description;

        @Column(nullable = false, precision = 12, scale = 2)
        private BigDecimal price;

        @Column(name = "stock_quantity", nullable = false)
        private Integer stockQuantity;

        @Column(length = 100)
        private String category;

        @Column(name = "image_url", length = 500)
        private String imageUrl;

        @Enumerated(EnumType.STRING)
        @Column(nullable = false, length = 20)
        @Builder.Default
        private ProductStatus status = ProductStatus.ACTIVE;

        /**
         * Optimistic Locking version field to prevent race conditions during concurrent
         * stock reservations/updates.
         */
        @Version
        @Column(nullable = false)
        private Long version;

        @CreationTimestamp
        @Column(name = "created_at", nullable = false, updatable = false)
        private LocalDateTime createdAt;

        @UpdateTimestamp
        @Column(name = "updated_at")
        private LocalDateTime updatedAt;
}
