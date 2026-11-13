package com.ecommerce.gateway.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

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

            String message = "Truy cập bị từ chối: endpoint nội bộ không cho phép gọi trực tiếp qua API Gateway";
            return GatewayErrorResponseWriter.writeJsonError(exchange, HttpStatus.FORBIDDEN, message, objectMapper);
        };
    }
}

