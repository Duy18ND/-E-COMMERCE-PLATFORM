package com.ecommerce.order.controller;

import com.ecommerce.order.dto.request.CheckoutItemRequest;
import com.ecommerce.order.dto.request.CheckoutRequest;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.enums.OrderStatus;
import com.ecommerce.order.enums.PaymentMethod;
import com.ecommerce.order.service.OrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OrderService orderService;

    @Test
    @DisplayName("Checkout: Trích xuất userId từ header X-User-Id thành công")
    void checkout_WithXUserIdHeader_Success() throws Exception {
        CheckoutItemRequest item = CheckoutItemRequest.builder()
                .productId(101L)
                .quantity(1)
                .build();

        CheckoutRequest request = CheckoutRequest.builder()
                .receiverName("Nguyễn Văn A")
                .receiverPhone("0987654321")
                .shippingAddress("Hà Nội")
                .paymentMethod(PaymentMethod.MOCK_ONLINE)
                .items(List.of(item))
                .build();

        OrderResponse response = OrderResponse.builder()
                .id(1L)
                .userId(10L)
                .status(OrderStatus.PENDING)
                .totalAmount(new BigDecimal("1000.00"))
                .build();

        when(orderService.checkout(any(CheckoutRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/orders/checkout")
                        .header("X-User-Id", 10L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1L))
                .andExpect(jsonPath("$.data.userId").value(10L));
    }

    @Test
    @DisplayName("Xem lịch sử đơn: X-User-Id khớp với path userId -> Trả về 200 OK")
    void getOrdersByUserId_Authorized_Success() throws Exception {
        OrderResponse response = OrderResponse.builder()
                .id(1L)
                .userId(10L)
                .status(OrderStatus.PENDING)
                .build();

        when(orderService.getOrdersByUserId(10L)).thenReturn(List.of(response));

        mockMvc.perform(get("/api/v1/orders/user/10")
                        .header("X-User-Id", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(1L));
    }

    @Test
    @DisplayName("Chống IDOR: X-User-Id khác với path userId -> Trả về 403 Forbidden")
    void getOrdersByUserId_IDOR_ShouldReturnForbidden() throws Exception {
        // User 999 cố xem đơn của User 10
        mockMvc.perform(get("/api/v1/orders/user/10")
                        .header("X-User-Id", 999L))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Bạn không có quyền xem đơn hàng của người dùng khác"));
    }

    @Test
    @DisplayName("Hủy đơn hàng: Truyền authenticatedUserId vào cancelOrder")
    void cancelOrder_WithXUserIdHeader_Success() throws Exception {
        OrderResponse response = OrderResponse.builder()
                .id(1L)
                .userId(10L)
                .status(OrderStatus.CANCELLED)
                .build();

        when(orderService.cancelOrder(eq(1L), eq(10L))).thenReturn(response);

        mockMvc.perform(put("/api/v1/orders/1/cancel")
                        .header("X-User-Id", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));
    }

    @Test
    @DisplayName("[ECOM-267] Tạo đơn hàng từ giỏ (POST /api/v1/orders/from-cart) thành công")
    void createOrderFromCart_Success() throws Exception {
        CheckoutRequest request = CheckoutRequest.builder()
                .receiverName("Đoàn Mạnh Duy")
                .receiverPhone("0987654321")
                .shippingAddress("123 Cầu Giấy, Hà Nội")
                .paymentMethod(PaymentMethod.COD)
                .build();

        OrderResponse response = OrderResponse.builder()
                .id(2002L)
                .userId(10L)
                .receiverName("Đoàn Mạnh Duy")
                .status(OrderStatus.PENDING)
                .totalAmount(new BigDecimal("1500.00"))
                .build();

        when(orderService.createOrderFromCart(eq(10L), any(CheckoutRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/orders/from-cart")
                        .header("X-User-Id", 10L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(2002L))
                .andExpect(jsonPath("$.data.receiverName").value("Đoàn Mạnh Duy"))
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }
}
