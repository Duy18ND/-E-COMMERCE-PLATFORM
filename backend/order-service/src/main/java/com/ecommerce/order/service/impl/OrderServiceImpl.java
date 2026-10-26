package com.ecommerce.order.service.impl;

import com.ecommerce.order.client.ProductClient;
import com.ecommerce.order.client.dto.StockReservationItem;
import com.ecommerce.order.dto.request.CheckoutItemRequest;
import com.ecommerce.order.dto.request.CheckoutRequest;
import com.ecommerce.order.dto.response.OrderItemResponse;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.OrderItem;
import com.ecommerce.order.enums.OrderStatus;
import com.ecommerce.order.event.OrderEvent;
import com.ecommerce.order.event.PaymentFailedEvent;
import com.ecommerce.order.event.PaymentSuccessEvent;
import com.ecommerce.order.exception.ResourceNotFoundException;
import com.ecommerce.order.producer.KafkaOrderProducer;
import com.ecommerce.order.repository.OrderRepository;
import com.ecommerce.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final ProductClient productClient;
    private final KafkaOrderProducer kafkaOrderProducer;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public OrderResponse checkout(CheckoutRequest request) {
        log.info("Processing checkout for userId: {}, items count: {}", request.getUserId(), request.getItems().size());

        // 1. Chuẩn bị danh sách trừ tồn kho và gọi FeignClient sang Product Service
        List<StockReservationItem> reservationItems = request.getItems().stream()
                .map(item -> StockReservationItem.builder()
                        .productId(item.getProductId())
                        .quantity(item.getQuantity())
                        .build())
                .toList();

        // Bước 1: Gọi FeignClient reserve-stock. Nếu Product Service trả về 409 hoặc 404,
        // ProductErrorDecoder sẽ ném ra NotEnoughStockException hoặc ProductNotFoundException
        // làm Spring Transaction tự động rollback toàn bộ dữ liệu.
        log.info("Calling ProductClient reserveStock for items: {}", reservationItems);
        productClient.reserveStock(reservationItems);

        // 2. Tính tổng tiền đơn hàng và tạo entity Order
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (CheckoutItemRequest itemReq : request.getItems()) {
            BigDecimal itemTotal = itemReq.getPriceAtPurchase()
                    .multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            totalAmount = totalAmount.add(itemTotal);
        }

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

        // Bước 2: Lưu Order với status = PENDING và list OrderItem (CascadeType.ALL)
        Order savedOrder = orderRepository.save(order);
        log.info("Order created successfully with id: {}, totalAmount: {}", savedOrder.getId(), savedOrder.getTotalAmount());

        // Bước 3: Bắn sự kiện order-created qua Kafka cho payment-service
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

    @Override
    @Transactional(rollbackFor = Exception.class)
    public OrderResponse cancelOrder(Long orderId) {
        log.info("Processing cancelOrder for orderId: {}", orderId);

        // 1. Tìm đơn hàng kèm chi tiết items
        Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId));

        // 2. Kiểm tra trạng thái: chỉ cho phép hủy nếu đơn hàng đang ở trạng thái PENDING
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new IllegalStateException("Chỉ có thể hủy đơn hàng ở trạng thái PENDING. Trạng thái hiện tại: " + order.getStatus());
        }

        // 3. Cập nhật trạng thái thành CANCELLED
        order.setStatus(OrderStatus.CANCELLED);
        Order updatedOrder = orderRepository.save(order);
        log.info("Order status updated to CANCELLED for orderId: {}", orderId);

        // 4. Gọi FeignClient restore-stock để hoàn lại tồn kho cho Product Service
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

        // 1. Cập nhật trạng thái đơn hàng sang FAILED
        order.setStatus(OrderStatus.FAILED);
        orderRepository.save(order);
        log.info("[Saga Step] Order status updated to FAILED for orderId: {}", event.getOrderId());

        // 2. Kích hoạt Compensating Transaction: Gọi ProductClient restoreStock để hoàn lại tồn kho
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
