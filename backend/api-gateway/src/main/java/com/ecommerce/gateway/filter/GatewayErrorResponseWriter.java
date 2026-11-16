package com.ecommerce.gateway.filter;

import com.ecommerce.gateway.dto.ApiResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

/**
 * Shared JSON error writer for API Gateway reactive filters.
 */
final class GatewayErrorResponseWriter {

    private GatewayErrorResponseWriter() {
    }

    static Mono<Void> writeJsonError(
            ServerWebExchange exchange,
            HttpStatus status,
            String message,
            ObjectMapper objectMapper) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        byte[] bytes;
        try {
            bytes = objectMapper.writeValueAsBytes(ApiResponse.error(message));
        } catch (JsonProcessingException e) {
            bytes = ("{\"success\":false,\"message\":\"" + message + "\"}").getBytes(StandardCharsets.UTF_8);
        }
        DataBuffer buffer = response.bufferFactory().wrap(bytes);
        return response.writeWith(Mono.just(buffer));
    }
}

