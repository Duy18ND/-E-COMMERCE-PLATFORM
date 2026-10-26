package com.ecommerce.order;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.kafka.annotation.EnableKafka;

/**
 * Order Service — Cart & Order Management.
 *
 * <p>Responsibilities:
 * <ul>
 *   <li>Shopping cart operations (add, update, remove, view)</li>
 *   <li>Order placement and lifecycle management</li>
 *   <li>Calls product-service (via Feign) to validate stock before order</li>
 *   <li>Publishes {@code order.created} events to Kafka for payment-service</li>
 *   <li>Consumes {@code payment.completed / payment.failed} to update order status</li>
 * </ul>
 * </p>
 */
@SpringBootApplication
@EnableDiscoveryClient
@EnableFeignClients
@EnableKafka
public class OrderServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApplication.class, args);
    }
}
