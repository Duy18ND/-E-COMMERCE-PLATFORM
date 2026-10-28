package com.ecommerce.order.client.decoder;

import com.ecommerce.order.exception.NotEnoughStockException;
import com.ecommerce.order.exception.OrderServiceException;
import com.ecommerce.order.exception.ProductNotFoundException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.Response;
import feign.codec.ErrorDecoder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Slf4j
@RequiredArgsConstructor
public class ProductErrorDecoder implements ErrorDecoder {

    private final ObjectMapper objectMapper;
    private final ErrorDecoder defaultDecoder = new Default();

    @Override
    public Exception decode(String methodKey, Response response) {
        String errorMessage = extractErrorMessage(response);
        int status = response.status();

        log.warn("Feign error from Product Service: methodKey={}, status={}, message={}",
                methodKey, status, errorMessage);

        if (status == HttpStatus.CONFLICT.value()) {
            return new NotEnoughStockException(errorMessage != null ? errorMessage : "Sản phẩm không đủ số lượng tồn kho");
        }

        if (status == HttpStatus.NOT_FOUND.value()) {
            return new ProductNotFoundException(errorMessage != null ? errorMessage : "Không tìm thấy sản phẩm trong hệ thống");
        }

        if (status >= 400 && status < 500) {
            return new OrderServiceException("Lỗi từ Product Service (" + status + "): " + errorMessage);
        }

        if (status >= 500) {
            return new OrderServiceException("Lỗi máy chủ Product Service (" + status + "): " + errorMessage);
        }

        return defaultDecoder.decode(methodKey, response);
    }

    private String extractErrorMessage(Response response) {
        if (response.body() == null) {
            return response.reason();
        }

        try (InputStream inputStream = response.body().asInputStream()) {
            JsonNode jsonNode = objectMapper.readTree(inputStream);
            if (jsonNode.hasNonNull("message")) {
                return jsonNode.get("message").asText();
            }
            if (jsonNode.hasNonNull("error")) {
                return jsonNode.get("error").asText();
            }
            return jsonNode.toString();
        } catch (Exception e) {
            log.warn("Không thể parse response body từ Product Service: {}", e.getMessage());
            return response.reason();
        }
    }
}
