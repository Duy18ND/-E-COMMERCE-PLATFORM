package com.ecommerce.auth.service;

import com.ecommerce.auth.dto.request.LoginRequest;
import com.ecommerce.auth.dto.request.RegisterRequest;
import com.ecommerce.auth.dto.request.TokenRefreshRequest;
import com.ecommerce.auth.dto.response.AuthResponse;

public interface AuthService {

    /**
     * Register a new user with BCrypt hashed password and default ROLE_USER.
     */
    AuthResponse register(RegisterRequest request);

    /**
     * Authenticate user credentials and return Access Token & Refresh Token.
     */
    AuthResponse login(LoginRequest request);

    /**
     * Issue a new Access Token using a valid Refresh Token.
     */
    AuthResponse refresh(TokenRefreshRequest request);

    /**
     * Invalidate Access Token by saving it to Redis blacklist with TTL equal to its remaining expiration time.
     */
    void logout(String token);
}
