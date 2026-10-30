package com.ecommerce.order.service.impl;

import com.ecommerce.order.client.ProductClient;
import com.ecommerce.order.client.dto.ProductResponse;
import com.ecommerce.order.client.dto.StockReservationItem;
import com.ecommerce.order.dto.request.CheckoutItemRequest;
import com.ecommerce.order.dto.request.CheckoutRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.DashboardResponse;
import com.ecommerce.order.dto.response.OrderItemResponse;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.dto.response.PagedResponse;
import com.ecommerce.order.entity.Cart;
import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.OrderItem;
import com.ecommerce.order.enums.OrderStatus;
import com.ecommerce.order.event.OrderEvent;
import com.ecommerce.order.event.PaymentFailedEvent;
import com.ecommerce.order.event.PaymentSuccessEvent;
import com.ecommerce.order.exception.AccessDeniedException;
import com.ecommerce.order.exception.ResourceNotFoundException;
import com.ecommerce.order.producer.KafkaOrderProducer;
import com.ecommerce.order.repository.CartRepository;
import com.ecommerce.order.repository.OrderRepository;
import com.ecommerce.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final ProductClient productClient;
    private final KafkaOrderProducer kafkaOrderProducer;
    private final CartRepository cartRepository;

    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED_TRANSITIONS = Map.of(
            OrderStatus.PENDING, Set.of(OrderStatus.PAID, OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.FAILED),
            OrderStatus.PAID, Set.of(OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.REFUNDED),
            OrderStatus.CONFIRMED, Set.of(OrderStatus.PROCESSING, OrderStatus.SHIPPING, OrderStatus.CANCELLED),
            OrderStatus.PROCESSING, Set.of(OrderStatus.SHIPPING, OrderStatus.CANCELLED),
            OrderStatus.SHIPPING, Set.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED),
            OrderStatus.DELIVERED, Set.of(OrderStatus.REFUNDED),
            OrderStatus.CANCELLED, Set.of(),
            OrderStatus.FAILED, Set.of(),
            OrderStatus.REFUNDED, Set.of()
    );

    private static final List<OrderStatus> REVENUE_STATUSES = List.of(
            OrderStatus.PAID,
            OrderStatus.CONFIRMED,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPING,
            OrderStatus.DELIVERED
    );

    @Override
    @Transactional(rollbackFor = Exception.class)
    public OrderResponse checkout(CheckoutRequest request) {
        // [Task ECOM-267] Nếu request không truyền kèm items (hoặc items rỗng), tự động lấy từ giỏ hàng hiện tại
        if (request.getItems() == null || request.getItems().isEmpty()) {
            return createOrderFromCart(request.getUserId(), request);
        }

        log.info("Processing checkout for userId: {}, items count: {}", request.getUserId(), request.getItems().size());

        // 1. Chống Price Tampering: Lấy giá chính xác mới nhất và tên từ Product Service (DB)
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (CheckoutItemRequest itemReq : request.getItems()) {
            ApiResponse<ProductResponse> productApiResponse = productClient.getProductById(itemReq.getProductId());
            if (productApiResponse == null || productApiResponse.getData() == null) {
                throw new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + itemReq.getProductId());
            }
            ProductResponse product = productApiResponse.getData();

            BigDecimal actualPrice = product.getPrice();
            if (actualPrice == null) {
                throw new IllegalStateException("Sản phẩm ID: " + itemReq.getProductId() + " chưa có giá hợp lệ");
            }

            // Ghi đè giá và tên sản phẩm từ DB chính xác
            itemReq.setPriceAtPurchase(actualPrice);
            if (product.getName() != null) {
                itemReq.setProductName(product.getName());
            }

            BigDecimal itemTotal = actualPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            totalAmount = totalAmount.add(itemTotal);
        }

        // 2. Chuẩn bị danh sách trừ tồn kho và gọi FeignClient sang Product Service
        List<StockReservationItem> reservationItems = request.getItems().stream()
                .map(item -> StockReservationItem.builder()
                        .productId(item.getProductId())
                        .quantity(item.getQuantity())
                        .build())
                .toList();

        log.info("Calling ProductClient reserveStock for {} items", reservationItems.size());
        productClient.reserveStock(reservationItems);

        // 3. Khởi tạo Order và OrderItems, lưu vào DB
        Order order = Order.builder()
                .userId(request.getUserId())
                .receiverName(request.getReceiverName())
                .receiverPhone(request.getReceiverPhone())
                .shippingAddress(request.getShippingAddress())
                .totalAmount(totalAmount)
                .status(OrderStatus.PENDING)
                .paymentMethod(request.getPaymentMethod())
                .build();

        for (CheckoutItemRequest itemReq : request.getItems()) {
            OrderItem orderItem = OrderItem.builder()
                    .productId(itemReq.getProductId())
                    .productName(itemReq.getProductName())
                    .quantity(itemReq.getQuantity())
                    .priceAtPurchase(itemReq.getPriceAtPurchase())
                    .build();
            order.addOrderItem(orderItem);
        }

        Order savedOrder = orderRepository.save(order);
        log.info("Order created successfully with id: {}, totalAmount: {}", savedOrder.getId(), savedOrder.getTotalAmount());

        // [Task ECOM-123 / ECOM-267] Làm trống giỏ hàng nếu user có giỏ hàng đang lưu
        if (request.getUserId() != null && cartRepository != null) {
            cartRepository.findByUserIdWithItems(request.getUserId()).ifPresent(c -> {
                if (c.getItems() != null && !c.getItems().isEmpty()) {
                    c.clearItems();
                    cartRepository.save(c);
                    log.info("[Task ECOM-267] Cleared active cart items for userId: {}", request.getUserId());
                }
            });
        }

        // 4. Bắn sự kiện order-created qua Kafka cho payment-service
        OrderEvent orderEvent = OrderEvent.builder()
                .orderId(savedOrder.getId())
                .userId(savedOrder.getUserId())
                .totalAmount(savedOrder.getTotalAmount())
                .paymentMethod(savedOrder.getPaymentMethod())
                .status(savedOrder.getStatus())
                .createdAt(savedOrder.getCreatedAt())
                .build();

        kafkaOrderProducer.sendOrderCreatedEvent(orderEvent);

        return mapToOrderResponse(savedOrder);
    }

    /**
     * [Task ECOM-267] API tạo đơn hàng từ giỏ (Create Order from Cart)
     * Phụ trách bởi: Đoàn Mạnh Duy
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public OrderResponse createOrderFromCart(Long userId, CheckoutRequest request) {
        Long targetUserId = userId != null ? userId : request.getUserId();
        if (targetUserId == null) {
            throw new AccessDeniedException("Thiếu thông tin người dùng xác thực (userId)");
        }
        log.info("[Task ECOM-267] Creating order from cart for userId: {}", targetUserId);

        Cart cart = cartRepository.findByUserIdWithItems(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giỏ hàng của người dùng ID: " + targetUserId));

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new IllegalStateException("Giỏ hàng của bạn đang trống! Vui lòng thêm sản phẩm vào giỏ trước khi đặt hàng.");
        }

        // Chuyển CartItem sang CheckoutItemRequest (chỉ cần productId và quantity, giá và tên sẽ lấy trực tiếp từ Product Service)
        List<CheckoutItemRequest> items = cart.getItems().stream()
                .map(ci -> CheckoutItemRequest.builder()
                        .productId(ci.getProductId())
                        .quantity(ci.getQuantity())
                        .build())
                .toList();

        request.setUserId(targetUserId);
        request.setItems(items);

        // Gọi logic checkout chuẩn (chống giá ảo, trừ tồn kho, lưu DB, bắn Kafka)
        return checkout(request);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public OrderResponse cancelOrder(Long orderId) {
        return cancelOrder(orderId, null);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public OrderResponse cancelOrder(Long orderId, Long userId) {
        log.info("Processing cancelOrder for orderId: {}, userId: {}", orderId, userId);

        Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (userId != null && !order.getUserId().equals(userId)) {
            throw new AccessDeniedException("Bạn không có quyền hủy đơn hàng này");
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new IllegalStateException("Chỉ có thể hủy đơn hàng ở trạng thái PENDING. Trạng thái hiện tại: " + order.getStatus());
        }

        order.setStatus(OrderStatus.CANCELLED);
        Order updatedOrder = orderRepository.save(order);
        log.info("Order status updated to CANCELLED for orderId: {}", orderId);

        List<StockReservationItem> restoreItems = order.getOrderItems().stream()
                .map(item -> StockReservationItem.builder()
                        .productId(item.getProductId())
                        .quantity(item.getQuantity())
                        .build())
                .toList();

        log.info("Calling ProductClient restoreStock for orderId {}: {}", orderId, restoreItems);
        productClient.restoreStock(restoreItems);

        return mapToOrderResponse(updatedOrder);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long id) {
        Order order = orderRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + id));
        return mapToOrderResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByUserId(Long userId) {
        List<Order> orders = orderRepository.findByUserIdWithItems(userId);
        return orders.stream()
                .map(this::mapToOrderResponse)
                .toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void handlePaymentSuccess(PaymentSuccessEvent event) {
        log.info("[Saga Step] Handling payment success for orderId: {}, txn: {}",
                event.getOrderId(), event.getTransactionCode());

        Order order = orderRepository.findById(event.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + event.getOrderId()));

        if (order.getStatus() == OrderStatus.PAID) {
            log.warn("[Saga Step] Order {} is already marked as PAID. Skipping duplicate event.", event.getOrderId());
            return;
        }

        order.setStatus(OrderStatus.PAID);
        orderRepository.save(order);
        log.info("[Saga Step] Order status successfully updated to PAID for orderId: {}", event.getOrderId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void handlePaymentFailed(PaymentFailedEvent event) {
        log.warn("[Saga Step] Handling payment failed for orderId: {}. Reason: {}",
                event.getOrderId(), event.getReason());

        Order order = orderRepository.findByIdWithItems(event.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + event.getOrderId()));

        if (order.getStatus() == OrderStatus.FAILED || order.getStatus() == OrderStatus.CANCELLED) {
            log.warn("[Saga Step] Order {} is already in terminal status: {}. Skipping duplicate failure handling.",
                    event.getOrderId(), order.getStatus());
            return;
        }

        order.setStatus(OrderStatus.FAILED);
        orderRepository.save(order);
        log.info("[Saga Step] Order status updated to FAILED for orderId: {}", event.getOrderId());

        List<StockReservationItem> restoreItems = order.getOrderItems().stream()
                .map(item -> StockReservationItem.builder()
                        .productId(item.getProductId())
                        .quantity(item.getQuantity())
                        .build())
                .toList();

        log.info("[Saga Rollback] Initiating compensating transaction: restoring stock for orderId {} with items: {}",
                event.getOrderId(), restoreItems);
        try {
            productClient.restoreStock(restoreItems);
            log.info("[Saga Rollback] Successfully restored stock for orderId: {}", event.getOrderId());
        } catch (Exception ex) {
            log.error("[Saga Rollback Error] Failed to restore stock for orderId {}: {}",
                    event.getOrderId(), ex.getMessage(), ex);
            throw ex;
        }
    }

    // ==========================================
    // Admin Operations (Task 10 & 11)
    // ==========================================

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<OrderResponse> getAllOrders(OrderStatus status, Pageable pageable) {
        Page<Order> orderPage = (status != null)
                ? orderRepository.findByStatus(status, pageable)
                : orderRepository.findAll(pageable);

        Page<OrderResponse> responsePage = orderPage.map(this::mapToOrderResponse);
        return PagedResponse.fromPage(responsePage);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public OrderResponse updateOrderStatus(Long orderId, OrderStatus newStatus) {
        log.info("Admin updating order status for orderId: {} to {}", orderId, newStatus);

        Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId));

        OrderStatus currentStatus = order.getStatus();

        if (currentStatus == newStatus) {
            log.info("Order {} is already in status {}. No transition needed.", orderId, newStatus);
            return mapToOrderResponse(order);
        }

        Set<OrderStatus> allowedNext = ALLOWED_TRANSITIONS.getOrDefault(currentStatus, Collections.emptySet());
        if (!allowedNext.contains(newStatus)) {
            throw new IllegalStateException(String.format("Không thể chuyển trạng thái đơn hàng từ %s sang %s", currentStatus, newStatus));
        }

        // Nếu chuyển sang CANCELLED, bắt buộc phải gọi FeignClient ProductClient.restoreStock để hoàn lại kho
        if (newStatus == OrderStatus.CANCELLED) {
            List<StockReservationItem> restoreItems = order.getOrderItems().stream()
                    .map(item -> StockReservationItem.builder()
                            .productId(item.getProductId())
                            .quantity(item.getQuantity())
                            .build())
                    .toList();

            log.info("Calling ProductClient restoreStock on CANCELLED for orderId {}: {}", orderId, restoreItems);
            productClient.restoreStock(restoreItems);
        }

        order.setStatus(newStatus);
        Order savedOrder = orderRepository.save(order);
        log.info("Order status updated successfully from {} to {} for orderId: {}", currentStatus, newStatus, orderId);

        return mapToOrderResponse(savedOrder);
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardResponse getOrderStatistics() {
        Long totalOrders = orderRepository.countTotalOrders();
        BigDecimal totalRevenue = orderRepository.sumTotalAmountByStatusIn(REVENUE_STATUSES);

        Map<OrderStatus, Long> ordersByStatus = new EnumMap<>(OrderStatus.class);
        for (OrderStatus s : OrderStatus.values()) {
            ordersByStatus.put(s, 0L);
        }

        List<Object[]> rows = orderRepository.countOrdersByStatusGroup();
        if (rows != null) {
            for (Object[] row : rows) {
                if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                    OrderStatus status;
                    if (row[0] instanceof OrderStatus os) {
                        status = os;
                    } else {
                        status = OrderStatus.valueOf(row[0].toString());
                    }
                    long count = ((Number) row[1]).longValue();
                    ordersByStatus.put(status, count);
                }
            }
        }

        return DashboardResponse.builder()
                .totalOrders(totalOrders != null ? totalOrders : 0L)
                .totalRevenue(totalRevenue != null ? totalRevenue : BigDecimal.ZERO)
                .ordersByStatus(ordersByStatus)
                .build();
    }

    private OrderResponse mapToOrderResponse(Order order) {
        List<OrderItemResponse> itemResponses = order.getOrderItems() != null
                ? order.getOrderItems().stream().map(this::mapToOrderItemResponse).toList()
                : List.of();

        return OrderResponse.builder()
                .id(order.getId())
                .userId(order.getUserId())
                .receiverName(order.getReceiverName())
                .receiverPhone(order.getReceiverPhone())
                .shippingAddress(order.getShippingAddress())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus())
                .paymentMethod(order.getPaymentMethod())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .items(itemResponses)
                .build();
    }

    private OrderItemResponse mapToOrderItemResponse(OrderItem item) {
        BigDecimal subTotal = item.getPriceAtPurchase() != null && item.getQuantity() != null
                ? item.getPriceAtPurchase().multiply(BigDecimal.valueOf(item.getQuantity()))
                : BigDecimal.ZERO;

        return OrderItemResponse.builder()
                .id(item.getId())
                .productId(item.getProductId())
                .productName(item.getProductName())
                .quantity(item.getQuantity())
                .priceAtPurchase(item.getPriceAtPurchase())
                .subTotal(subTotal)
                .build();
    }
}
