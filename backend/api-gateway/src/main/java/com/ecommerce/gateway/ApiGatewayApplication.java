package com.ecommerce.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * API Gateway — Single entry point for all microservices.
 *
 * <p>Routes traffic to downstream services using Spring Cloud Gateway
 * with Eureka-based load balancing (lb:// scheme).</p>
 *
 * <p>Base URL: http://localhost:8080</p>
 */
@SpringBootApplication
@EnableDiscoveryClient
public class ApiGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}
