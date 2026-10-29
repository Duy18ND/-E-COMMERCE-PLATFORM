package com.ecommerce.order.service;

import com.ecommerce.order.client.ProductClient;
import com.ecommerce.order.client.dto.StockReservationItem;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.DashboardResponse;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.dto.response.PagedResponse;
import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.OrderItem;
import com.ecommerce.order.enums.OrderStatus;
import com.ecommerce.order.enums.PaymentMethod;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminOrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductClient productClient;

    @Mock
    private KafkaOrderProducer kafkaOrderProducer;

    @InjectMocks
    private OrderServiceImpl orderService;

    private Order sampleOrder;

    @BeforeEach
    void setUp() {
        OrderItem item1 = OrderItem.builder()
                .id(1L)
                .productId(101L)
                .productName("Sản phẩm A")
                .quantity(2)
                .priceAtPurchase(new BigDecimal("150000"))
                .build();

        OrderItem item2 = OrderItem.builder()
                .id(2L)
                .productId(102L)
                .productName("Sản phẩm B")
                .quantity(1)
                .priceAtPurchase(new BigDecimal("200000"))
                .build();

        sampleOrder = Order.builder()
                .id(1L)
                .userId(100L)
                .receiverName("Nguyễn Văn A")
                .receiverPhone("0987654321")
                .shippingAddress("123 Đường ABC, Hà Nội")
                .totalAmount(new BigDecimal("500000"))
                .status(OrderStatus.PENDING)
                .paymentMethod(PaymentMethod.COD)
                .createdAt(LocalDateTime.now())
                .orderItems(new ArrayList<>(List.of(item1, item2)))
                .build();

        item1.setOrder(sampleOrder);
        item2.setOrder(sampleOrder);
    }

    // ==============================================================
    // State Machine Unit Tests (Task 10)
    // ==============================================================

    @Test
    @DisplayName("State Machine: PENDING -> CONFIRMED hợp lệ")
    void updateOrderStatus_PendingToConfirmed_Success() {
        when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(sampleOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse response = orderService.updateOrderStatus(1L, OrderStatus.CONFIRMED);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        verify(orderRepository, times(1)).save(sampleOrder);
        verify(productClient, never()).restoreStock(any());
    }

    @Test
    @DisplayName("State Machine: PENDING -> PAID hợp lệ")
    void updateOrderStatus_PendingToPaid_Success() {
        when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(sampleOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse response = orderService.updateOrderStatus(1L, OrderStatus.PAID);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(OrderStatus.PAID);
        verify(orderRepository, times(1)).save(sampleOrder);
        verify(productClient, never()).restoreStock(any());
    }

    @Test
    @DisplayName("State Machine: Idempotent khi trạng thái mới trùng trạng thái hiện tại")
    void updateOrderStatus_SameStatus_ShouldBeIdempotent() {
        when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(sampleOrder));

        OrderResponse response = orderService.updateOrderStatus(1L, OrderStatus.PENDING);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(OrderStatus.PENDING);
        verify(orderRepository, never()).save(any(Order.class));
        verify(productClient, never()).restoreStock(any());
    }

    @Test
    @DisplayName("State Machine: Không thể lùi trạng thái từ DELIVERED về PENDING -> ném IllegalStateException")
    void updateOrderStatus_DeliveredToPending_ShouldThrowIllegalStateException() {
        sampleOrder.setStatus(OrderStatus.DELIVERED);
        when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(sampleOrder));

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> orderService.updateOrderStatus(1L, OrderStatus.PENDING)
        );

        assertThat(ex.getMessage()).contains("Không thể chuyển trạng thái đơn hàng từ DELIVERED sang PENDING");
        verify(orderRepository, never()).save(any(Order.class));
        verify(productClient, never()).restoreStock(any());
    }

    @Test
    @DisplayName("State Machine: Không thể chuyển từ DELIVERED sang CANCELLED -> ném IllegalStateException")
    void updateOrderStatus_DeliveredToCancelled_ShouldThrowIllegalStateException() {
        sampleOrder.setStatus(OrderStatus.DELIVERED);
        when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(sampleOrder));

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> orderService.updateOrderStatus(1L, OrderStatus.CANCELLED)
        );

        assertThat(ex.getMessage()).contains("Không thể chuyển trạng thái đơn hàng từ DELIVERED sang CANCELLED");
        verify(orderRepository, never()).save(any(Order.class));
        verify(productClient, never()).restoreStock(any());
    }

    @Test
    @DisplayName("State Machine & Stock: Chuyển sang CANCELLED bắt buộc gọi ProductClient.restoreStock")
    void updateOrderStatus_ToCancelled_ShouldCallRestoreStock() {
        when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(sampleOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(productClient.restoreStock(any())).thenReturn(ApiResponse.success(null));

        OrderResponse response = orderService.updateOrderStatus(1L, OrderStatus.CANCELLED);

        assertThat(response.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        verify(orderRepository, times(1)).save(sampleOrder);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<StockReservationItem>> captor = ArgumentCaptor.forClass(List.class);
        verify(productClient, times(1)).restoreStock(captor.capture());

        List<StockReservationItem> restoredItems = captor.getValue();
        assertThat(restoredItems).hasSize(2);
        assertThat(restoredItems.get(0).getProductId()).isEqualTo(101L);
        assertThat(restoredItems.get(0).getQuantity()).isEqualTo(2);
        assertThat(restoredItems.get(1).getProductId()).isEqualTo(102L);
        assertThat(restoredItems.get(1).getQuantity()).isEqualTo(1);
    }

    // ==============================================================
    // Order Listing & Pagination (Task 10)
    // ==============================================================

    @Test
    @DisplayName("getAllOrders: Có lọc theo status -> Gọi findByStatus")
    void getAllOrders_WithStatus_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Order> page = new PageImpl<>(List.of(sampleOrder), pageable, 1);
        when(orderRepository.findByStatus(eq(OrderStatus.PENDING), eq(pageable))).thenReturn(page);

        PagedResponse<OrderResponse> result = orderService.getAllOrders(OrderStatus.PENDING, pageable);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
        verify(orderRepository, times(1)).findByStatus(OrderStatus.PENDING, pageable);
        verify(orderRepository, never()).findAll(any(Pageable.class));
    }

    @Test
    @DisplayName("getAllOrders: Không lọc theo status (status = null) -> Gọi findAll")
    void getAllOrders_WithoutStatus_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Order> page = new PageImpl<>(List.of(sampleOrder), pageable, 1);
        when(orderRepository.findAll(eq(pageable))).thenReturn(page);

        PagedResponse<OrderResponse> result = orderService.getAllOrders(null, pageable);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(orderRepository, times(1)).findAll(pageable);
        verify(orderRepository, never()).findByStatus(any(), any());
    }

    // ==============================================================
    // Dashboard Statistics Unit Tests (Task 11)
    // ==============================================================

    @Test
    @DisplayName("getOrderStatistics: Thống kê tổng số đơn, tổng doanh thu và số lượng theo trạng thái chính xác")
    void getOrderStatistics_Success() {
        // GIVEN
        when(orderRepository.countTotalOrders()).thenReturn(25L);
        when(orderRepository.sumTotalAmountByStatusIn(any())).thenReturn(new BigDecimal("15000000.00"));

        List<Object[]> rawCounts = List.of(
                new Object[]{OrderStatus.PENDING, 5L},
                new Object[]{OrderStatus.PAID, 8L},
                new Object[]{OrderStatus.DELIVERED, 10L},
                new Object[]{OrderStatus.CANCELLED, 2L}
        );
        when(orderRepository.countOrdersByStatusGroup()).thenReturn(rawCounts);

        // WHEN
        DashboardResponse stats = orderService.getOrderStatistics();

        // THEN
        assertThat(stats).isNotNull();
        assertThat(stats.getTotalOrders()).isEqualTo(25L);
        assertThat(stats.getTotalRevenue()).isEqualByComparingTo("15000000.00");

        // Verify count by status map
        assertThat(stats.getOrdersByStatus()).isNotNull();
        assertThat(stats.getOrdersByStatus().get(OrderStatus.PENDING)).isEqualTo(5L);
        assertThat(stats.getOrdersByStatus().get(OrderStatus.PAID)).isEqualTo(8L);
        assertThat(stats.getOrdersByStatus().get(OrderStatus.DELIVERED)).isEqualTo(10L);
        assertThat(stats.getOrdersByStatus().get(OrderStatus.CANCELLED)).isEqualTo(2L);
        // Trạng thái không có đơn hàng nào trong DB mặc định là 0
        assertThat(stats.getOrdersByStatus().get(OrderStatus.SHIPPING)).isEqualTo(0L);
        assertThat(stats.getOrdersByStatus().get(OrderStatus.PROCESSING)).isEqualTo(0L);
        assertThat(stats.getOrdersByStatus().get(OrderStatus.FAILED)).isEqualTo(0L);
        assertThat(stats.getOrdersByStatus().get(OrderStatus.REFUNDED)).isEqualTo(0L);

        verify(orderRepository, times(1)).countTotalOrders();
        verify(orderRepository, times(1)).sumTotalAmountByStatusIn(any());
        verify(orderRepository, times(1)).countOrdersByStatusGroup();
    }
}
