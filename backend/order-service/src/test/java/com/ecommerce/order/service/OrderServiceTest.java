package com.ecommerce.order.service;

import com.ecommerce.order.client.ProductClient;
import com.ecommerce.order.client.dto.StockReservationItem;
import com.ecommerce.order.dto.request.CheckoutItemRequest;
import com.ecommerce.order.dto.request.CheckoutRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.OrderItem;
import com.ecommerce.order.enums.OrderStatus;
import com.ecommerce.order.enums.PaymentMethod;
import com.ecommerce.order.event.OrderEvent;
import com.ecommerce.order.exception.NotEnoughStockException;
import com.ecommerce.order.exception.ProductNotFoundException;
import com.ecommerce.order.exception.ResourceNotFoundException;
import com.ecommerce.order.producer.KafkaOrderProducer;
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

    @InjectMocks
    private OrderServiceImpl orderService;

    private CheckoutRequest sampleCheckoutRequest;
    private Order samplePendingOrder;

    @BeforeEach
    void setUp() {
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
    @DisplayName("Checkout thành công: Trừ kho Feign thành công -> Lưu DB PENDING -> Bắn Kafka event")
    void checkout_Success() {
        // GIVEN: Feign trừ kho thành công
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
    @DisplayName("Checkout thất bại do thiếu tồn kho: Feign quăng NotEnoughStockException -> KHÔNG lưu database, KHÔNG bắn Kafka")
    void checkout_StockReservationFailed_ShouldNotSaveDatabaseAndNotSendKafka() {
        // GIVEN: Product Client trả về lỗi thiếu hàng trong kho
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
    @DisplayName("Checkout thất bại do không tìm thấy sản phẩm: Feign quăng ProductNotFoundException -> KHÔNG lưu database")
    void checkout_ProductNotFound_ShouldNotSaveDatabase() {
        // GIVEN: Product Client trả về lỗi 404 không tìm thấy sản phẩm
        when(productClient.reserveStock(any()))
                .thenThrow(new ProductNotFoundException("Không tìm thấy sản phẩm với ID: 101"));

        // WHEN & THEN
        assertThrows(
                ProductNotFoundException.class,
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
}
