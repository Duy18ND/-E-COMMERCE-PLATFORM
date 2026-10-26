package com.ecommerce.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * Auth Service — JWT-based Authentication & Authorization.
 *
 * <p>Responsibilities:
 * <ul>
 *   <li>User registration (POST /api/v1/auth/register)</li>
 *   <li>User login — issues JWT access + refresh tokens (POST /api/v1/auth/login)</li>
 *   <li>Token refresh (POST /api/v1/auth/refresh)</li>
 *   <li>Token validation endpoint consumed by API Gateway</li>
 *   <li>Logout — blacklists token in Redis</li>
 * </ul>
 * </p>
 */
@SpringBootApplication
@EnableDiscoveryClient
public class AuthServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuthServiceApplication.class, args);
    }
}
