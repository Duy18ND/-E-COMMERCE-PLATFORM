package com.ecommerce.gateway.filter;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class BlockExternalAccessGatewayFilterFactoryTest {

    @Test
    @DisplayName("[Fix-D.2] Chặn endpoint nội bộ qua API Gateway với 403 Forbidden")
    void shouldRejectExternalRequestWithForbidden() {
        BlockExternalAccessGatewayFilterFactory factory = new BlockExternalAccessGatewayFilterFactory();
        MockServerHttpRequest request = MockServerHttpRequest.post("/api/v1/products/reserve-stock").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        GatewayFilterChain chain = mock(GatewayFilterChain.class);

        StepVerifier.create(factory.apply(new Object()).filter(exchange, chain))
                .verifyComplete();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        verifyNoInteractions(chain);
    }
}

