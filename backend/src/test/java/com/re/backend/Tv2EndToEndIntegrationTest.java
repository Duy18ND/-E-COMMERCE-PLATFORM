package com.re.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.re.backend.cart.AddToCartRequest;
import com.re.backend.order.CheckoutRequest;
import com.re.backend.order.Order;
import com.re.backend.order.OrderRepository;
import com.re.backend.order.OrderStatus;
import com.re.backend.payment.MockPayRequest;
import com.re.backend.payment.Payment;
import com.re.backend.payment.PaymentMethod;
import com.re.backend.payment.PaymentRepository;
import com.re.backend.payment.PaymentStatus;
import com.re.backend.product.Product;
import com.re.backend.product.ProductRepository;
import com.re.backend.security.LoginRequest;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Slf4j
@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class Tv2EndToEndIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    private String userToken;
    private String adminToken;
    private Long orderId;
    private int initialProduct1Stock;

    @BeforeAll
    void setupInitialState() {
        this.mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        Product p1 = productRepository.findById(1L)
                .orElseThrow(() -> new IllegalStateException("Product 1 must be seeded by DataSeeder"));
        initialProduct1Stock = p1.getStockQuantity();
        log.info("=== Initial Product 1 stock: {} ===", initialProduct1Stock);
    }

    /**
     * Bước 1 (Auth):
     * Đăng nhập với tài khoản user@gmail.com / 123456, kiểm tra trả về HTTP 200 và lấy được accessToken.
     */
    @Test
    @org.junit.jupiter.api.Order(1)
    void step1_AuthLogin_Success() throws Exception {
        log.info("--> [STEP 1] Testing Auth Login with user@gmail.com / 123456");

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("user@gmail.com");
        loginRequest.setPassword("123456");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andExpect(jsonPath("$.data.email").value("user@gmail.com"))
                .andReturn();

        JsonNode rootNode = objectMapper.readTree(result.getResponse().getContentAsString());
        userToken = rootNode.path("data").path("accessToken").asText();

        assertNotNull(userToken, "User access token must not be null");
        assertFalse(userToken.isBlank(), "User access token must not be blank");

        log.info(">>> [STEP 1 PASS] Auth: Đăng nhập thành công, token lấy được: {}...", userToken.substring(0, Math.min(25, userToken.length())));
    }

    /**
     * Bước 2 (Cart):
     * Dùng token vừa lấy gọi POST /api/cart/items thêm productId = 1 với quantity = 2,
     * sau đó gọi GET /api/cart kiểm tra tổng tiền và số lượng trong giỏ.
     */
    @Test
    @org.junit.jupiter.api.Order(2)
    void step2_Cart_AddItemsAndVerify() throws Exception {
        log.info("--> [STEP 2] Adding productId=1 with quantity=2 to cart");

        AddToCartRequest addRequest = new AddToCartRequest();
        addRequest.setProductId(1L);
        addRequest.setQuantity(2);

        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(addRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.items", hasSize(greaterThanOrEqualTo(1))));

        log.info("--> [STEP 2] Verifying cart via GET /api/cart");

        // Product 1 price = 32,990,000; quantity = 2 -> total = 65,980,000
        BigDecimal expectedTotal = new BigDecimal("32990000").multiply(BigDecimal.valueOf(2));

        MvcResult cartResult = mockMvc.perform(get("/api/cart")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.items[0].productId").value(1))
                .andExpect(jsonPath("$.data.items[0].quantity").value(2))
                .andReturn();

        JsonNode cartJson = objectMapper.readTree(cartResult.getResponse().getContentAsString());
        BigDecimal actualTotalPrice = new BigDecimal(cartJson.path("data").path("totalPrice").asText());
        assertEquals(0, expectedTotal.compareTo(actualTotalPrice),
                "Total price in cart must equal expected total: " + expectedTotal);

        log.info(">>> [STEP 2 PASS] Cart: Đã thêm 2 sản phẩm và xác thực tổng tiền: {}", actualTotalPrice);
    }

    /**
     * Bước 3 (Checkout & Trừ kho):
     * Gọi POST /api/orders/checkout để tạo đơn hàng từ giỏ.
     * Kiểm tra đơn hàng ở trạng thái PENDING, giỏ hàng đã được làm trống, và stockQuantity của productId = 1 trong DB đã giảm đi 2 đơn vị.
     */
    @Test
    @org.junit.jupiter.api.Order(3)
    void step3_CheckoutAndStockDeduction() throws Exception {
        log.info("--> [STEP 3] Calling POST /api/orders/checkout");

        CheckoutRequest checkoutRequest = new CheckoutRequest();
        checkoutRequest.setReceiverName("Nguyễn Văn User");
        checkoutRequest.setReceiverPhone("0987654321");
        checkoutRequest.setShippingAddress("123 Cầu Giấy, Hà Nội");
        checkoutRequest.setNote("Giao trong giờ hành chính");
        checkoutRequest.setPaymentMethod(PaymentMethod.MOCK_ONLINE);

        MvcResult result = mockMvc.perform(post("/api/orders/checkout")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(checkoutRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(201))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.items", hasSize(1)))
                .andReturn();

        JsonNode rootNode = objectMapper.readTree(result.getResponse().getContentAsString());
        orderId = rootNode.path("data").path("id").asLong();
        assertTrue(orderId > 0, "Created orderId must be positive");

        log.info("--> [STEP 3] Created orderId: {}, verifying cart is now empty", orderId);

        // Kiểm tra giỏ hàng đã được làm trống
        mockMvc.perform(get("/api/cart")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items", hasSize(0)))
                .andExpect(jsonPath("$.data.totalPrice").value(BigDecimal.ZERO));

        // Kiểm tra tồn kho của Product 1 đã giảm đúng 2 đơn vị
        Product product1 = productRepository.findById(1L).orElseThrow();
        int expectedStock = initialProduct1Stock - 2;
        assertEquals(expectedStock, product1.getStockQuantity(),
                "Stock quantity of product 1 must be deducted by 2");

        log.info(">>> [STEP 3 PASS] Checkout: Đơn hàng {} ở trạng thái PENDING, giỏ hàng rỗng, tồn kho đã giảm từ {} xuống {}",
                orderId, initialProduct1Stock, product1.getStockQuantity());
    }

    /**
     * Bước 4 (Payment Mock):
     * Gọi POST /api/payments/mock-pay/{orderId} với {"success": true}.
     * Kiểm tra trạng thái đơn hàng chuyển sang PAID và Payment chuyển sang SUCCESS.
     */
    @Test
    @org.junit.jupiter.api.Order(4)
    void step4_MockPayment_Success() throws Exception {
        log.info("--> [STEP 4] Mock payment for orderId: {}", orderId);

        MockPayRequest payRequest = new MockPayRequest();
        payRequest.setSuccess(true);

        mockMvc.perform(post("/api/payments/mock-pay/" + orderId)
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.transactionCode").isString())
                .andExpect(jsonPath("$.data.paidAt").isNotEmpty());

        // Kiểm tra trạng thái đơn hàng trong DB chuyển sang PAID
        Order updatedOrder = orderRepository.findById(orderId).orElseThrow();
        assertEquals(OrderStatus.PAID, updatedOrder.getStatus(), "Order status must transition to PAID");

        // Kiểm tra payment trong DB chuyển sang SUCCESS
        Payment payment = paymentRepository.findByOrderId(orderId).orElseThrow();
        assertEquals(PaymentStatus.SUCCESS, payment.getStatus(), "Payment status must be SUCCESS");
        assertNotNull(payment.getTransactionCode(), "Transaction code must be generated");
        assertNotNull(payment.getPaidAt(), "PaidAt timestamp must be recorded");

        log.info(">>> [STEP 4 PASS] Payment: Đơn hàng {} đã chuyển sang PAID, Payment SUCCESS với mã giao dịch: {}",
                orderId, payment.getTransactionCode());
    }

    /**
     * Bước 5 (Hoàn kho khi Hủy đơn):
     * Tạo thêm 1 đơn hàng mới ở trạng thái PENDING, sau đó gọi PUT /api/orders/{orderId}/cancel
     * và kiểm tra stockQuantity của sản phẩm được cộng trả lại đúng như ban đầu.
     */
    @Test
    @org.junit.jupiter.api.Order(5)
    void step5_CancelOrder_RestoreStock() throws Exception {
        log.info("--> [STEP 5] Testing stock restoration upon order cancellation");

        // Lấy tồn kho trước khi tạo đơn thứ 2
        int stockBeforeNewOrder = productRepository.findById(1L).orElseThrow().getStockQuantity();

        // 1. Thêm 1 sản phẩm vào giỏ
        AddToCartRequest addRequest = new AddToCartRequest();
        addRequest.setProductId(1L);
        addRequest.setQuantity(1);

        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(addRequest)))
                .andExpect(status().isOk());

        // 2. Checkout đơn hàng mới (phương thức COD)
        CheckoutRequest checkoutRequest = new CheckoutRequest();
        checkoutRequest.setReceiverName("Khách Hàng Hủy");
        checkoutRequest.setReceiverPhone("0912345678");
        checkoutRequest.setShippingAddress("456 Kim Mã, Ba Đình, Hà Nội");
        checkoutRequest.setNote("Đơn thử nghiệm hủy");
        checkoutRequest.setPaymentMethod(PaymentMethod.COD);

        MvcResult checkoutResult = mockMvc.perform(post("/api/orders/checkout")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(checkoutRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andReturn();

        JsonNode root = objectMapper.readTree(checkoutResult.getResponse().getContentAsString());
        long newOrderId = root.path("data").path("id").asLong();

        // Kiểm tra tồn kho đã giảm 1
        int stockAfterCheckout = productRepository.findById(1L).orElseThrow().getStockQuantity();
        assertEquals(stockBeforeNewOrder - 1, stockAfterCheckout, "Stock should be reduced by 1 after checkout");

        log.info("--> [STEP 5] Order {} created in PENDING status, stock reduced to {}. Now canceling order...",
                newOrderId, stockAfterCheckout);

        // 3. Gọi PUT /api/orders/{orderId}/cancel để hủy đơn
        mockMvc.perform(put("/api/orders/" + newOrderId + "/cancel")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        // 4. Kiểm tra trạng thái đơn hàng trong DB là CANCELLED
        Order cancelledOrder = orderRepository.findById(newOrderId).orElseThrow();
        assertEquals(OrderStatus.CANCELLED, cancelledOrder.getStatus(), "Order status must be CANCELLED");

        // 5. Kiểm tra tồn kho đã được cộng trả lại đúng bằng stockBeforeNewOrder
        int stockAfterCancel = productRepository.findById(1L).orElseThrow().getStockQuantity();
        assertEquals(stockBeforeNewOrder, stockAfterCancel,
                "Stock quantity must be restored to original value after order cancellation");

        log.info(">>> [STEP 5 PASS] Cancel Order: Đơn hàng {} đã hủy thành công, tồn kho được hoàn trả từ {} về {}",
                newOrderId, stockAfterCheckout, stockAfterCancel);
    }

    /**
     * Bước 6 (Admin):
     * Đăng nhập tài khoản admin@gmail.com / 123456, gọi GET /api/admin/orders/stats
     * và GET /api/admin/orders kiểm tra trả về HTTP 200.
     */
    @Test
    @org.junit.jupiter.api.Order(6)
    void step6_Admin_OrdersAndStats() throws Exception {
        log.info("--> [STEP 6] Admin Login with admin@gmail.com / 123456");

        LoginRequest adminLogin = new LoginRequest();
        adminLogin.setEmail("admin@gmail.com");
        adminLogin.setPassword("123456");

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andReturn();

        JsonNode root = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        adminToken = root.path("data").path("accessToken").asText();

        assertNotNull(adminToken, "Admin token must not be null");

        log.info("--> [STEP 6] Calling GET /api/admin/orders/stats");

        mockMvc.perform(get("/api/admin/orders/stats")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.totalOrders", greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.data.totalRevenue").isNotEmpty())
                .andExpect(jsonPath("$.data.paidCount", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.data.cancelledCount", greaterThanOrEqualTo(1)));

        log.info("--> [STEP 6] Calling GET /api/admin/orders");

        mockMvc.perform(get("/api/admin/orders")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(2))));

        log.info(">>> [STEP 6 PASS] Admin: Đăng nhập admin thành công, kiểm tra API thống kê và danh sách đơn hàng trả về HTTP 200");
    }
}
