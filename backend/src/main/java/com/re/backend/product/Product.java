package com.re.backend.product;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * STUB Entity - Tạm thời để module Cart có thể liên kết khóa ngoại.
 * Sẽ được thành viên phụ trách Product mở rộng sau.
 */
@Entity
@Table(name = "products")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal price;

    @Column(length = 500)
    private String imageUrl;

    @Column(nullable = false)
    private Integer stockQuantity;
}
