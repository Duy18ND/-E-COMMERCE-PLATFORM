package com.ecommerce.order.controller;

import com.ecommerce.order.dto.request.AddToCartRequest;
import com.ecommerce.order.dto.request.UpdateCartItemRequest;
import com.ecommerce.order.dto.response.CartItemResponse;
import com.ecommerce.order.dto.response.CartResponse;
import com.ecommerce.order.service.CartService;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CartController.class)
class CartControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CartService cartService;

    @Test
    @DisplayName("Xem giỏ hàng: Có header X-User-Id -> 200 OK")
    void getCart_WithHeader_Success() throws Exception {
        CartResponse response = CartResponse.builder()
                .id(1L)
                .userId(10L)
                .totalItems(1)
                .totalAmount(new BigDecimal("1000.00"))
                .items(List.of(CartItemResponse.builder()
                        .id(101L)
                        .productId(101L)
                        .productName("iPhone")
                        .price(new BigDecimal("1000.00"))
                        .quantity(1)
                        .subTotal(new BigDecimal("1000.00"))
                        .build()))
                .build();

        when(cartService.getCart(10L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/cart")
                        .header("X-User-Id", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(10L))
                .andExpect(jsonPath("$.data.totalItems").value(1));
    }

    @Test
    @DisplayName("Xem giỏ hàng: Không có header X-User-Id -> 403 Forbidden")
    void getCart_WithoutHeader_ShouldReturnForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/cart"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Thêm vào giỏ hàng: Thành công -> 201 Created")
    void addToCart_Success() throws Exception {
        AddToCartRequest request = AddToCartRequest.builder()
                .productId(101L)
                .quantity(2)
                .build();

        CartResponse response = CartResponse.builder()
                .id(1L)
                .userId(10L)
                .totalItems(2)
                .totalAmount(new BigDecimal("2000.00"))
                .build();

        when(cartService.addToCart(eq(10L), any(AddToCartRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/cart/items")
                        .header("X-User-Id", 10L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalItems").value(2));
    }

    @Test
    @DisplayName("Cập nhật số lượng sản phẩm: Thành công -> 200 OK")
    void updateCartItem_Success() throws Exception {
        UpdateCartItemRequest request = UpdateCartItemRequest.builder()
                .quantity(5)
                .build();

        CartResponse response = CartResponse.builder()
                .id(1L)
                .userId(10L)
                .totalItems(5)
                .build();

        when(cartService.updateCartItem(eq(10L), eq(100L), any(UpdateCartItemRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/v1/cart/items/100")
                        .header("X-User-Id", 10L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalItems").value(5));
    }

    @Test
    @DisplayName("Xóa sản phẩm khỏi giỏ: Thành công -> 200 OK")
    void removeCartItem_Success() throws Exception {
        CartResponse response = CartResponse.builder()
                .id(1L)
                .userId(10L)
                .totalItems(0)
                .build();

        when(cartService.removeCartItem(10L, 100L)).thenReturn(response);

        mockMvc.perform(delete("/api/v1/cart/items/100")
                        .header("X-User-Id", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalItems").value(0));
    }

    @Test
    @DisplayName("Xóa toàn bộ giỏ: Thành công -> 200 OK")
    void clearCart_Success() throws Exception {
        mockMvc.perform(delete("/api/v1/cart")
                        .header("X-User-Id", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(cartService).clearCart(10L);
    }
}
