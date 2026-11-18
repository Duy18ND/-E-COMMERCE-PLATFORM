package com.ecommerce.chatbot;

import com.ecommerce.chatbot.client.OrderClient;
import com.ecommerce.chatbot.client.ProductClient;
import com.ecommerce.chatbot.client.dto.OrderDto;
import com.ecommerce.chatbot.client.dto.PagedData;
import com.ecommerce.chatbot.client.dto.ProductDto;
import com.ecommerce.chatbot.client.dto.ProductStockDto;
import com.ecommerce.chatbot.dto.request.ChatMessageRequest;
import com.ecommerce.chatbot.dto.response.ApiResponse;
import com.ecommerce.chatbot.dto.response.ChatMessageResponse;
import com.ecommerce.chatbot.dto.response.ConversationDetailResponse;
import com.ecommerce.chatbot.dto.response.ConversationSummaryResponse;
import com.ecommerce.chatbot.exception.AccessDeniedException;
import com.ecommerce.chatbot.service.ChatService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:chatbot_test_db;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "eureka.client.enabled=false",
    "spring.cloud.discovery.enabled=false",
    "ai.provider.api-key="
})
class ChatbotServiceApplicationTests {

    @Autowired
    private ChatService chatService;

    @MockBean
    private ProductClient productClient;

    @MockBean
    private OrderClient orderClient;

    private ProductDto dellXps;
    private ProductDto macbookAir;

    @BeforeEach
    void setUp() {
        dellXps = ProductDto.builder()
                .id(1L)
                .name("Laptop Dell XPS 15")
                .category("Laptop & Workstation")
                .price(new BigDecimal("32990000"))
                .stockQuantity(50)
                .imageUrl("https://example.com/dell-xps.jpg")
                .description("Laptop Dell XPS 15 OLED Core i7")
                .status("ACTIVE")
                .build();

        macbookAir = ProductDto.builder()
                .id(6L)
                .name("MacBook Air M2 13 inch")
                .category("Laptop & Workstation")
                .price(new BigDecimal("24500000"))
                .stockQuantity(8)
                .imageUrl("https://example.com/macbook-air.jpg")
                .description("MacBook Air M2 mỏng nhẹ pin 18 giờ")
                .status("ACTIVE")
                .build();

        PagedData<ProductDto> pagedProducts = PagedData.<ProductDto>builder()
                .content(List.of(dellXps, macbookAir))
                .pageNumber(0)
                .pageSize(8)
                .totalElements(2)
                .totalPages(1)
                .last(true)
                .build();

        when(productClient.getProducts(any(), any(), any(), any(), any(), anyInt(), anyInt(), any()))
                .thenReturn(ApiResponse.success("OK", pagedProducts));
        when(productClient.getProductById(1L)).thenReturn(ApiResponse.success("OK", dellXps));
        when(productClient.getProductById(6L)).thenReturn(ApiResponse.success("OK", macbookAir));
        when(productClient.checkProductStock(eq(1L), anyInt())).thenReturn(
                ApiResponse.success("OK", ProductStockDto.builder()
                        .productId(1L)
                        .productName("Laptop Dell XPS 15")
                        .stockQuantity(50)
                        .requestedQuantity(1)
                        .status("ACTIVE")
                        .inStock(true)
                        .sufficientStock(true)
                        .stockStatusMessage("Còn hàng (50 sản phẩm có sẵn)")
                        .build())
        );
    }

    @Test
    void contextLoadsAndHandlesProductSearchCompareStockAndMemory() {
        // 1. Product Search using "question" field
        ChatMessageResponse searchRes = chatService.sendMessage(
                ChatMessageRequest.builder().question("Gợi ý laptop dưới 35 triệu").build(),
                10L, "ROLE_USER", null
        );
        assertNotNull(searchRes.getConversationId());
        assertFalse(searchRes.getProducts().isEmpty());
        assertEquals("/products/1", searchRes.getProducts().get(0).getProductUrl());
        assertTrue(searchRes.getToolsUsed().contains("searchProducts"));
        assertNotNull(searchRes.getAnswer());

        String convId = searchRes.getConversationId();

        // 2. Product Comparison using Conversation Memory
        ChatMessageResponse compareRes = chatService.sendMessage(
                ChatMessageRequest.builder().conversationId(convId).question("So sánh Dell XPS 15 và MacBook Air M2").build(),
                10L, "ROLE_USER", null
        );
        assertEquals(2, compareRes.getProducts().size());
        assertTrue(compareRes.getToolsUsed().contains("compareProducts"));

        // 3. Stock Check
        ChatMessageResponse stockRes = chatService.sendMessage(
                ChatMessageRequest.builder().conversationId(convId).message("Kiểm tra tồn kho Laptop Dell XPS 15").build(),
                10L, "ROLE_USER", null
        );
        assertTrue(stockRes.getToolsUsed().contains("getProductStock"));
        assertTrue(stockRes.getAnswer().contains("50"));

        // 4. Customer Support Policy Check
        ChatMessageResponse policyRes = chatService.sendMessage(
                ChatMessageRequest.builder().conversationId(convId).question("Chính sách bảo hành và đổi trả như thế nào?").build(),
                10L, "ROLE_USER", null
        );
        assertTrue(policyRes.getToolsUsed().contains("getReturnPolicy"));
        assertTrue(policyRes.getToolsUsed().contains("getWarrantyPolicy"));

        // 5. Verify Conversation History & Ownership
        ConversationDetailResponse detail = chatService.getConversationDetail(convId, 10L, null);
        assertEquals(8, detail.getMessages().size()); // 4 user + 4 assistant messages

        // Other user cannot access user 10's conversation (Anti-IDOR)
        assertThrows(AccessDeniedException.class, () ->
                chatService.getConversationDetail(convId, 99L, null)
        );
    }

    @Test
    void customerOrderTrackingEnforcesIdentityAndBlocksOtherUsersOrders() {
        OrderDto userOrder = OrderDto.builder()
                .id(101L)
                .userId(10L)
                .receiverName("Nguyễn Văn A")
                .receiverPhone("0912345678")
                .shippingAddress("123 Cầu Giấy, Hà Nội")
                .totalAmount(new BigDecimal("24500000"))
                .status("SHIPPING")
                .build();

        when(orderClient.getOrderById(101L, 10L, "ROLE_USER"))
                .thenReturn(ApiResponse.success("OK", userOrder));

        ChatMessageResponse orderRes = chatService.sendMessage(
                ChatMessageRequest.builder().question("Kiểm tra đơn hàng #101").build(),
                10L, "ROLE_USER", null
        );
        assertNotNull(orderRes.getReferencedOrder());
        assertEquals(101L, orderRes.getReferencedOrder().getId());
        assertTrue(orderRes.getToolsUsed().contains("getOrderStatus"));

        // Unauthenticated user cannot look up orders
        ChatMessageResponse guestOrderRes = chatService.sendMessage(
                ChatMessageRequest.builder().question("Kiểm tra đơn hàng #101").build(),
                null, null, "guest-123"
        );
        assertNull(guestOrderRes.getReferencedOrder());
        assertTrue(guestOrderRes.getAnswer().contains("đăng nhập"));
    }

    @Test
    void createAndDeleteConversationEnforcesOwnership() {
        ConversationSummaryResponse created = chatService.createConversation("Tư vấn mua MacBook", 25L, null);
        assertNotNull(created.getId());

        // Another user cannot delete user 25's conversation
        assertThrows(AccessDeniedException.class, () ->
                chatService.deleteConversation(created.getId(), 99L, null)
        );

        // Owner can delete conversation
        assertDoesNotThrow(() -> chatService.deleteConversation(created.getId(), 25L, null));
    }
}

