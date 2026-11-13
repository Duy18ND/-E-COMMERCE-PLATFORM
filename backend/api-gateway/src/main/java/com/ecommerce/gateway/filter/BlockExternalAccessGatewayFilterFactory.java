package com.ecommerce.gateway.filter;

import com.ecommerce.gateway.dto.ApiResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

/**
 * Blocks external access via API Gateway to internal service-to-service endpoints
 * (such as inventory reserve/restore and Flash Sale reserve/restore).
 */
@Slf4j
@Component("BlockExternalAccess")
public class BlockExternalAccessGatewayFilterFactory extends AbstractGatewayFilterFactory<Object> {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public BlockExternalAccessGatewayFilterFactory() {
        super(Object.class);
    }

    @Override
    public String name() {
        return "BlockExternalAccess";
    }

    @Override
    public GatewayFilter apply(Object config) {
        return (exchange, chain) -> {
            log.warn("[Gateway Security] Blocked external request to internal endpoint: {} {}",
                    exchange.getRequest().getMethod(),
                    exchange.getRequest().getURI().getPath());

            ServerHttpResponse response = exchange.getResponse();
            response.setStatusCode(HttpStatus.FORBIDDEN);
            response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

            String message = "Truy cập bị từ chối: endpoint nội bộ không cho phép gọi trực tiếp qua API Gateway";
            byte[] bytes;
            try {
                bytes = objectMapper.writeValueAsBytes(ApiResponse.error(message));
            } catch (JsonProcessingException e) {
                bytes = ("{\"success\":false,\"message\":\"" + message + "\"}").getBytes(StandardCharsets.UTF_8);
            }
            DataBuffer buffer = response.bufferFactory().wrap(bytes);
            return response.writeWith(Mono.just(buffer));
        };
    }
}

