package com.ecommerce.payment.controller;

import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.enums.PaymentStatus;
import com.ecommerce.payment.exception.GlobalExceptionHandler;
import com.ecommerce.payment.exception.ResourceNotFoundException;
import com.ecommerce.payment.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentController Unit Tests")
class PaymentControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PaymentService paymentService;

    @InjectMocks
    private PaymentController paymentController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(paymentController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/payments/order/{orderId} - Should return 200 and payment details")
    void testGetPaymentByOrderId_Success() throws Exception {
        PaymentResponse response = PaymentResponse.builder()
                .id(1L)
                .orderId(101L)
                .amount(new BigDecimal("15000000"))
                .paymentMethod("MOCK_ONLINE")
                .status(PaymentStatus.SUCCESS)
                .transactionCode("TXN-123456789")
                .createdAt(LocalDateTime.now())
                .build();

        when(paymentService.getPaymentByOrderId(101L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/payments/order/{orderId}", 101L)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderId").value(101))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.transactionCode").value("TXN-123456789"));
    }

    @Test
    @DisplayName("GET /api/v1/payments/order/{orderId} - Should return 404 when payment not found")
    void testGetPaymentByOrderId_NotFound() throws Exception {
        when(paymentService.getPaymentByOrderId(999L))
                .thenThrow(new ResourceNotFoundException("Không tìm thấy thông tin thanh toán cho đơn hàng ID: 999"));

        mockMvc.perform(get("/api/v1/payments/order/{orderId}", 999L)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Không tìm thấy thông tin thanh toán cho đơn hàng ID: 999"));
    }

    @Test
    @DisplayName("GET /api/v1/payments/{id} - Should return 200 and payment details")
    void testGetPaymentById_Success() throws Exception {
        PaymentResponse response = PaymentResponse.builder()
                .id(5L)
                .orderId(202L)
                .amount(new BigDecimal("5000000"))
                .paymentMethod("COD")
                .status(PaymentStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        when(paymentService.getPaymentById(5L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/payments/{id}", 5L)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(5))
                .andExpect(jsonPath("$.data.orderId").value(202))
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    /**
     * [Task ECOM-269] Kiểm tra API POST /api/v1/payments/mock-pay/{orderId}
     */
    @Test
    @DisplayName("[ECOM-269] POST /api/v1/payments/mock-pay/{orderId} - Thanh toán thành công -> 200 OK")
    void testMockPay_Success() throws Exception {
        PaymentResponse response = PaymentResponse.builder()
                .id(1L)
                .orderId(101L)
                .amount(new BigDecimal("15000000"))
                .paymentMethod("MOCK_ONLINE")
                .status(PaymentStatus.SUCCESS)
                .transactionCode("TXN-SUCCESS123")
                .build();

        when(paymentService.mockPay(101L, true)).thenReturn(response);

        mockMvc.perform(post("/api/v1/payments/mock-pay/{orderId}", 101L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"success\": true, \"note\": \"Khách thanh toán thử nghiệm thành công\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xác nhận thanh toán mô phỏng thành công"))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.transactionCode").value("TXN-SUCCESS123"));
    }

    @Test
    @DisplayName("[ECOM-269] POST /api/v1/payments/mock-pay/{orderId} - Thanh toán thất bại -> 200 OK với thông báo Saga Rollback")
    void testMockPay_Failure() throws Exception {
        PaymentResponse response = PaymentResponse.builder()
                .id(2L)
                .orderId(102L)
                .amount(new BigDecimal("5000000"))
                .paymentMethod("MOCK_ONLINE")
                .status(PaymentStatus.FAILED)
                .build();

        when(paymentService.mockPay(102L, false)).thenReturn(response);

        mockMvc.perform(post("/api/v1/payments/mock-pay/{orderId}", 102L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"success\": false, \"note\": \"Tài khoản không đủ số dư\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Thanh toán mô phỏng thất bại — đã kích hoạt hoàn kho (Saga Rollback)"))
                .andExpect(jsonPath("$.data.status").value("FAILED"));
    }

    @Test
    @DisplayName("[ECOM-269] POST /api/v1/payments/mock-pay/{orderId} - Thiếu trường success -> 400 Bad Request")
    void testMockPay_MissingSuccess_ShouldReturnBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/payments/mock-pay/{orderId}", 101L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\": \"Thiếu trường success\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
