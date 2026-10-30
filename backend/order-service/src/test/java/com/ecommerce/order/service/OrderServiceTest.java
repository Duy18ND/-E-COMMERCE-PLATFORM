package com.ecommerce.order.service;

import com.ecommerce.order.client.ProductClient;
import com.ecommerce.order.client.dto.ProductResponse;
import com.ecommerce.order.client.dto.StockReservationItem;
import com.ecommerce.order.dto.request.CheckoutItemRequest;
import com.ecommerce.order.dto.request.CheckoutRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.entity.Cart;
import com.ecommerce.order.entity.CartItem;
import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.OrderItem;
import com.ecommerce.order.enums.OrderStatus;
import com.ecommerce.order.enums.PaymentMethod;
import com.ecommerce.order.event.OrderEvent;
import com.ecommerce.order.exception.AccessDeniedException;
import com.ecommerce.order.exception.NotEnoughStockException;
import com.ecommerce.order.exception.ProductNotFoundException;
import com.ecommerce.order.exception.ResourceNotFoundException;
import com.ecommerce.order.producer.KafkaOrderProducer;
import com.ecommerce.order.repository.CartRepository;
import com.ecommerce.order.repository.OrderRepository;
import com.ecommerce.order.service.impl.OrderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductClient productClient;

    @Mock
    private KafkaOrderProducer kafkaOrderProducer;

    @Mock
    private CartRepository cartRepository;

    @InjectMocks
    private OrderServiceImpl orderService;

    private CheckoutRequest sampleCheckoutRequest;
    private Order samplePendingOrder;
    private ProductResponse sampleProduct1;
    private ProductResponse sampleProduct2;

    @BeforeEach
    void setUp() {
        sampleProduct1 = ProductResponse.builder()
                .id(101L)
                .name("iPhone 15 Pro")
                .price(new BigDecimal("1000.00"))
                .stockQuantity(10)
                .build();

        sampleProduct2 = ProductResponse.builder()
                .id(102L)
                .name("Ốp lưng MagSafe")
                .price(new BigDecimal("50.00"))
                .stockQuantity(20)
                .build();

        CheckoutItemRequest item1 = CheckoutItemRequest.builder()
                .productId(101L)
                .productName("iPhone 15 Pro")
                .quantity(2)
                .priceAtPurchase(new BigDecimal("1000.00"))
                .build();

        CheckoutItemRequest item2 = CheckoutItemRequest.builder()
                .productId(102L)
                .productName("Ốp lưng MagSafe")
                .quantity(1)
                .priceAtPurchase(new BigDecimal("50.00"))
                .build();

        sampleCheckoutRequest = CheckoutRequest.builder()
                .userId(1L)
                .receiverName("Nguyễn Văn A")
                .receiverPhone("0987654321")
                .shippingAddress("123 Cầu Giấy, Hà Nội")
                .paymentMethod(PaymentMethod.MOCK_ONLINE)
                .items(List.of(item1, item2))
                .build();

        samplePendingOrder = Order.builder()
                .id(1L)
                .userId(1L)
                .receiverName("Nguyễn Văn A")
                .receiverPhone("0987654321")
                .shippingAddress("123 Cầu Giấy, Hà Nội")
                .totalAmount(new BigDecimal("2050.00"))
                .status(OrderStatus.PENDING)
                .paymentMethod(PaymentMethod.MOCK_ONLINE)
                .createdAt(LocalDateTime.now())
                .orderItems(new ArrayList<>())
                .build();

        OrderItem orderItem1 = OrderItem.builder()
                .id(10L)
                .order(samplePendingOrder)
                .productId(101L)
                .productName("iPhone 15 Pro")
                .quantity(2)
                .priceAtPurchase(new BigDecimal("1000.00"))
                .build();
        samplePendingOrder.addOrderItem(orderItem1);
    }

    @Test
    @DisplayName("Checkout thành công: Lấy giá chính xác từ ProductClient -> Trừ kho Feign -> Lưu DB PENDING -> Bắn Kafka event")
    void checkout_Success() {
        // GIVEN: Feign lấy giá và trừ kho thành công
        when(productClient.getProductById(101L)).thenReturn(ApiResponse.success(sampleProduct1));
        when(productClient.getProductById(102L)).thenReturn(ApiResponse.success(sampleProduct2));
        when(productClient.reserveStock(any())).thenReturn(ApiResponse.success(null));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            o.setId(1L);
            o.setCreatedAt(LocalDateTime.now());
            return o;
        });

        // WHEN
        OrderResponse response = orderService.checkout(sampleCheckoutRequest);

        // THEN: Kiểm tra response
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("2050.00"));
        assertThat(response.getItems()).hasSize(2);

        // VERIFY: Đã gọi getProductById cho từng item để chống Price Tampering
        verify(productClient, times(1)).getProductById(101L);
        verify(productClient, times(1)).getProductById(102L);

        // VERIFY: Đã gọi trừ kho 1 lần
        verify(productClient, times(1)).reserveStock(any());

        // VERIFY: Đã lưu Order vào Database
        verify(orderRepository, times(1)).save(any(Order.class));

        // VERIFY: Đã bắn sự kiện order-created qua Kafka với đúng thông tin
        ArgumentCaptor<OrderEvent> eventCaptor = ArgumentCaptor.forClass(OrderEvent.class);
        verify(kafkaOrderProducer, times(1)).sendOrderCreatedEvent(eventCaptor.capture());

        OrderEvent capturedEvent = eventCaptor.getValue();
        assertThat(capturedEvent.getOrderId()).isEqualTo(1L);
        assertThat(capturedEvent.getUserId()).isEqualTo(1L);
        assertThat(capturedEvent.getTotalAmount()).isEqualByComparingTo(new BigDecimal("2050.00"));
        assertThat(capturedEvent.getPaymentMethod()).isEqualTo(PaymentMethod.MOCK_ONLINE);
    }

    @Test
    @DisplayName("Chống Price Tampering: Client gửi giá 1.00 -> Hệ thống tự ghi đè bằng giá DB 1000.00 & 50.00, tổng tiền vẫn là 2050.00")
    void checkout_PriceTamperingPrevention() {
        // GIVEN: Client cố tình gửi giá 1.00 VNĐ
        CheckoutItemRequest tamperedItem1 = CheckoutItemRequest.builder()
                .productId(101L)
                .productName("Fake name")
                .quantity(2)
                .priceAtPurchase(new BigDecimal("1.00")) // Client hack giá
                .build();

        CheckoutItemRequest tamperedItem2 = CheckoutItemRequest.builder()
                .productId(102L)
                .productName("Fake case")
                .quantity(1)
                .priceAtPurchase(new BigDecimal("1.00")) // Client hack giá
                .build();

        CheckoutRequest tamperedRequest = CheckoutRequest.builder()
                .userId(1L)
                .receiverName("Hacker")
                .receiverPhone("0987654321")
                .shippingAddress("Nowhere")
                .paymentMethod(PaymentMethod.MOCK_ONLINE)
                .items(List.of(tamperedItem1, tamperedItem2))
                .build();

        when(productClient.getProductById(101L)).thenReturn(ApiResponse.success(sampleProduct1));
        when(productClient.getProductById(102L)).thenReturn(ApiResponse.success(sampleProduct2));
        when(productClient.reserveStock(any())).thenReturn(ApiResponse.success(null));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            o.setId(1L);
            o.setCreatedAt(LocalDateTime.now());
            return o;
        });

        // WHEN
        OrderResponse response = orderService.checkout(tamperedRequest);

        // THEN: Tổng tiền phải tính theo giá 1000.00 * 2 + 50.00 * 1 = 2050.00 chứ KHÔNG PHẢI 3.00
        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("2050.00"));
        assertThat(tamperedItem1.getPriceAtPurchase()).isEqualByComparingTo(new BigDecimal("1000.00"));
        assertThat(tamperedItem2.getPriceAtPurchase()).isEqualByComparingTo(new BigDecimal("50.00"));
    }

    @Test
    @DisplayName("Checkout thất bại do thiếu tồn kho: Feign quăng NotEnoughStockException -> KHÔNG lưu database, KHÔNG bắn Kafka")
    void checkout_StockReservationFailed_ShouldNotSaveDatabaseAndNotSendKafka() {
        // GIVEN: Product Client trả về lỗi thiếu hàng trong kho
        when(productClient.getProductById(101L)).thenReturn(ApiResponse.success(sampleProduct1));
        when(productClient.getProductById(102L)).thenReturn(ApiResponse.success(sampleProduct2));
        when(productClient.reserveStock(any()))
                .thenThrow(new NotEnoughStockException("Sản phẩm ID 101 không đủ số lượng tồn kho"));

        // WHEN & THEN: Phải quăng ra NotEnoughStockException
        NotEnoughStockException exception = assertThrows(
                NotEnoughStockException.class,
                () -> orderService.checkout(sampleCheckoutRequest)
        );

        assertThat(exception.getMessage()).contains("không đủ số lượng tồn kho");

        // VERIFY: Tuyệt đối KHÔNG lưu đơn hàng vào database (đảm bảo rollback)
        verify(orderRepository, never()).save(any(Order.class));

        // VERIFY: Tuyệt đối KHÔNG bắn sự kiện Kafka
        verify(kafkaOrderProducer, never()).sendOrderCreatedEvent(any());
    }

    @Test
    @DisplayName("Checkout thất bại do không tìm thấy sản phẩm: ProductClient trả về null -> Ném ResourceNotFoundException")
    void checkout_ProductNotFound_ShouldNotSaveDatabase() {
        // GIVEN: Product Client trả về null (sản phẩm không tồn tại)
        when(productClient.getProductById(101L)).thenReturn(ApiResponse.error("Không tìm thấy"));

        // WHEN & THEN
        assertThrows(
                ResourceNotFoundException.class,
                () -> orderService.checkout(sampleCheckoutRequest)
        );

        // VERIFY: Không lưu DB và không gửi Kafka
        verify(orderRepository, never()).save(any(Order.class));
        verify(kafkaOrderProducer, never()).sendOrderCreatedEvent(any());
    }

    @Test
    @DisplayName("Hủy đơn hàng thành công: Đơn PENDING -> Chuyển CANCELLED -> Gọi Feign restore-stock hoàn lại kho")
    void cancelOrder_Success() {
        // GIVEN: Đơn hàng ở trạng thái PENDING
        when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(samplePendingOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(productClient.restoreStock(any())).thenReturn(ApiResponse.success(null));

        // WHEN
        OrderResponse response = orderService.cancelOrder(1L);

        // THEN: Trạng thái đổi thành CANCELLED
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(OrderStatus.CANCELLED);

        // VERIFY: Đã gọi lưu Order CANCELLED
        verify(orderRepository, times(1)).save(samplePendingOrder);

        // VERIFY: Đã gọi Feign restore-stock đúng danh sách sản phẩm
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<StockReservationItem>> captor = ArgumentCaptor.forClass(List.class);
        verify(productClient, times(1)).restoreStock(captor.capture());

        List<StockReservationItem> restoredItems = captor.getValue();
        assertThat(restoredItems).hasSize(1);
        assertThat(restoredItems.get(0).getProductId()).isEqualTo(101L);
        assertThat(restoredItems.get(0).getQuantity()).isEqualTo(2);
    }

    @Test
    @DisplayName("Hủy đơn hàng thất bại do IDOR: Người dùng không phải chủ sở hữu đơn hàng -> Ném AccessDeniedException")
    void cancelOrder_UnauthorizedUser_ShouldThrowAccessDeniedException() {
        // GIVEN: Đơn hàng thuộc userId = 1L
        when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(samplePendingOrder));

        // WHEN & THEN: User 999L cố hủy đơn của User 1L -> Ném AccessDeniedException
        assertThrows(
                AccessDeniedException.class,
                () -> orderService.cancelOrder(1L, 999L)
        );

        verify(productClient, never()).restoreStock(any());
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    @DisplayName("Hủy đơn hàng thành công khi đúng chủ sở hữu đơn hàng")
    void cancelOrder_AuthorizedUser_Success() {
        when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(samplePendingOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(productClient.restoreStock(any())).thenReturn(ApiResponse.success(null));

        OrderResponse response = orderService.cancelOrder(1L, 1L);

        assertThat(response.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        verify(productClient, times(1)).restoreStock(any());
    }

    @Test
    @DisplayName("Hủy đơn hàng thất bại: Đơn hàng đã PAID -> Ném IllegalStateException và KHÔNG hoàn kho")
    void cancelOrder_WhenStatusNotPending_ShouldThrowIllegalStateException() {
        // GIVEN: Đơn hàng đã chuyển sang PAID
        samplePendingOrder.setStatus(OrderStatus.PAID);
        when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(samplePendingOrder));

        // WHEN & THEN: Không cho phép hủy
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> orderService.cancelOrder(1L)
        );

        assertThat(ex.getMessage()).contains("Chỉ có thể hủy đơn hàng ở trạng thái PENDING");

        // VERIFY: KHÔNG gọi Feign restore-stock
        verify(productClient, never()).restoreStock(any());
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    @DisplayName("Hủy đơn hàng thất bại: Không tìm thấy ID đơn hàng -> Ném ResourceNotFoundException")
    void cancelOrder_NotFound_ShouldThrowResourceNotFoundException() {
        // GIVEN: Không tìm thấy đơn hàng
        when(orderRepository.findByIdWithItems(999L)).thenReturn(Optional.empty());

        // WHEN & THEN
        assertThrows(
                ResourceNotFoundException.class,
                () -> orderService.cancelOrder(999L)
        );

        verify(productClient, never()).restoreStock(any());
    }

    @Test
    @DisplayName("Lấy chi tiết đơn hàng thành công")
    void getOrderById_Success() {
        when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(samplePendingOrder));

        OrderResponse response = orderService.getOrderById(1L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getItems()).hasSize(1);
        verify(orderRepository, times(1)).findByIdWithItems(1L);
    }

    @Test
    @DisplayName("Lấy chi tiết đơn hàng không tồn tại -> Ném ResourceNotFoundException")
    void getOrderById_NotFound() {
        when(orderRepository.findByIdWithItems(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> orderService.getOrderById(999L));
    }

    @Test
    @DisplayName("Saga Step: Xử lý payment-success -> Cập nhật Order.status = PAID")
    void handlePaymentSuccess_Success() {
        // GIVEN
        com.ecommerce.order.event.PaymentSuccessEvent event = com.ecommerce.order.event.PaymentSuccessEvent.builder()
                .orderId(1L)
                .paymentId(10L)
                .transactionCode("TXN-TEST1234")
                .build();

        when(orderRepository.findById(1L)).thenReturn(Optional.of(samplePendingOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // WHEN
        orderService.handlePaymentSuccess(event);

        // THEN
        assertThat(samplePendingOrder.getStatus()).isEqualTo(OrderStatus.PAID);
        verify(orderRepository, times(1)).save(samplePendingOrder);
        verify(productClient, never()).restoreStock(any());
    }

    @Test
    @DisplayName("Saga Rollback: Xử lý payment-failed -> Cập nhật Order.status = FAILED và hoàn lại tồn kho")
    void handlePaymentFailed_CompensatingTransaction() {
        // GIVEN
        com.ecommerce.order.event.PaymentFailedEvent event = com.ecommerce.order.event.PaymentFailedEvent.builder()
                .orderId(1L)
                .reason("Số dư không đủ")
                .build();

        when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(samplePendingOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(productClient.restoreStock(any())).thenReturn(ApiResponse.success("Stock restored", null));

        // WHEN
        orderService.handlePaymentFailed(event);

        // THEN
        assertThat(samplePendingOrder.getStatus()).isEqualTo(OrderStatus.FAILED);
        verify(orderRepository, times(1)).save(samplePendingOrder);

        // Verify Saga Compensating Transaction: productClient.restoreStock called!
        ArgumentCaptor<List<StockReservationItem>> captor = ArgumentCaptor.forClass(List.class);
        verify(productClient, times(1)).restoreStock(captor.capture());

        List<StockReservationItem> restoredItems = captor.getValue();
        assertThat(restoredItems).hasSize(1);
        assertThat(restoredItems.get(0).getProductId()).isEqualTo(101L);
        assertThat(restoredItems.get(0).getQuantity()).isEqualTo(2);
    }

    // =========================================================================
    // [Task ECOM-267] Unit Tests cho tạo đơn hàng từ giỏ (createOrderFromCart)
    // =========================================================================

    @Test
    @DisplayName("[ECOM-267] Tạo đơn hàng từ giỏ thành công và làm trống giỏ hàng")
    void createOrderFromCart_Success() {
        // GIVEN
        Long userId = 1L;
        Cart cart = Cart.builder()
                .id(1L)
                .userId(userId)
                .items(new ArrayList<>())
                .build();

        CartItem item1 = CartItem.builder()
                .id(10L)
                .cart(cart)
                .productId(101L)
                .quantity(1)
                .build();
        cart.getItems().add(item1);

        CheckoutRequest request = CheckoutRequest.builder()
                .userId(userId)
                .receiverName("Đoàn Mạnh Duy")
                .receiverPhone("0987654321")
                .shippingAddress("Hà Nội, Việt Nam")
                .paymentMethod(PaymentMethod.COD)
                .build();

        when(cartRepository.findByUserIdWithItems(userId)).thenReturn(Optional.of(cart));
        when(productClient.getProductById(101L)).thenReturn(ApiResponse.success("Success", sampleProduct1));
        when(productClient.reserveStock(any())).thenReturn(ApiResponse.success("Reserved", null));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            o.setId(1001L);
            return o;
        });

        // WHEN
        OrderResponse response = orderService.createOrderFromCart(userId, request);

        // THEN
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1001L);
        assertThat(response.getReceiverName()).isEqualTo("Đoàn Mạnh Duy");
        // Giỏ hàng phải được làm trống sau khi tạo đơn
        assertThat(cart.getItems()).isEmpty();
        verify(cartRepository, times(1)).save(cart);
        verify(productClient, times(1)).reserveStock(any());
        verify(kafkaOrderProducer, times(1)).sendOrderCreatedEvent(any(OrderEvent.class));
    }

    @Test
    @DisplayName("[ECOM-267] Ném IllegalStateException khi tạo đơn hàng từ giỏ hàng rỗng")
    void createOrderFromCart_EmptyCart_ShouldThrowIllegalStateException() {
        Long userId = 1L;
        Cart emptyCart = Cart.builder()
                .id(1L)
                .userId(userId)
                .items(new ArrayList<>())
                .build();

        CheckoutRequest request = CheckoutRequest.builder()
                .userId(userId)
                .receiverName("Đoàn Mạnh Duy")
                .receiverPhone("0987654321")
                .shippingAddress("Hà Nội, Việt Nam")
                .paymentMethod(PaymentMethod.COD)
                .build();

        when(cartRepository.findByUserIdWithItems(userId)).thenReturn(Optional.of(emptyCart));

        assertThrows(IllegalStateException.class, () -> orderService.createOrderFromCart(userId, request));
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("[ECOM-267] Ném ResourceNotFoundException khi không tìm thấy giỏ hàng của user")
    void createOrderFromCart_CartNotFound_ShouldThrowResourceNotFoundException() {
        Long userId = 999L;
        CheckoutRequest request = CheckoutRequest.builder()
                .userId(userId)
                .receiverName("Đoàn Mạnh Duy")
                .receiverPhone("0987654321")
                .shippingAddress("Hà Nội, Việt Nam")
                .paymentMethod(PaymentMethod.COD)
                .build();

        when(cartRepository.findByUserIdWithItems(userId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> orderService.createOrderFromCart(userId, request));
        verify(orderRepository, never()).save(any());
    }
}
