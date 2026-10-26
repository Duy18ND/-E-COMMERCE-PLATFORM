package com.ecommerce.product;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;

/**
 * Product Service — Catalog & Inventory Management.
 *
 * <p>Responsibilities:
 * <ul>
 *   <li>CRUD operations for products (GET/POST/PUT/DELETE /api/v1/products)</li>
 *   <li>Inventory/stock management per product</li>
 *   <li>Product search and filtering</li>
 *   <li>Redis caching for frequently-read product data</li>
 * </ul>
 * </p>
 */
@SpringBootApplication
@EnableDiscoveryClient
@EnableCaching
@EnableFeignClients
public class ProductServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ProductServiceApplication.class, args);
    }
}
