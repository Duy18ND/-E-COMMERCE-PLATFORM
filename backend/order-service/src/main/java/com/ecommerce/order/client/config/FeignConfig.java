package com.ecommerce.order.client.config;

import com.ecommerce.order.client.decoder.ProductErrorDecoder;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.RequestInterceptor;
import feign.codec.ErrorDecoder;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class FeignConfig {

    @Bean
    public ErrorDecoder errorDecoder(ObjectMapper objectMapper) {
        return new ProductErrorDecoder(objectMapper);
    }

    /**
     * [Task ECOM-145 / ECOM-326] Chuyển tiếp các header xác thực & phân quyền (Authorization, X-User-Id, X-User-Roles)
     * từ request hiện tại sang các dịch vụ nội bộ (như auth-service, product-service).
     * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
     */
    @Bean
    public RequestInterceptor requestHeaderForwardingInterceptor() {
        return template -> {
            RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
            if (attributes instanceof ServletRequestAttributes servletAttributes) {
                HttpServletRequest request = servletAttributes.getRequest();
                forwardHeaderIfPresent(request, template, "Authorization");
                forwardHeaderIfPresent(request, template, "X-User-Id");
                forwardHeaderIfPresent(request, template, "X-User-Roles");
            }
        };
    }

    private void forwardHeaderIfPresent(HttpServletRequest request, feign.RequestTemplate template, String headerName) {
        String value = request.getHeader(headerName);
        if (StringUtils.hasText(value)) {
            template.header(headerName, value);
        }
    }
}
