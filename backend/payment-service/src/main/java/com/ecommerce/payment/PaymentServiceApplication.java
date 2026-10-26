package com.ecommerce.payment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.kafka.annotation.EnableKafka;

/**
 * Payment Service — Mock Payment Processing & Transaction History.
 *
 * <p>Responsibilities:
 * <ul>
 *   <li>Consumes {@code order.created} events from Kafka</li>
 *   <li>Simulates payment processing (configurable success/failure rate)</li>
 *   <li>Publishes {@code payment.completed} or {@code payment.failed} events</li>
 *   <li>Stores transaction history in payment_db</li>
 *   <li>REST endpoints for payment status and history</li>
 * </ul>
 * </p>
 */
@SpringBootApplication
@EnableDiscoveryClient
@EnableFeignClients
@EnableKafka
public class PaymentServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PaymentServiceApplication.class, args);
    }
}
