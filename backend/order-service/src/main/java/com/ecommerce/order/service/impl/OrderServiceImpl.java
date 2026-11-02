package com.ecommerce.order.service.impl;

import com.ecommerce.order.client.ProductClient;
import com.ecommerce.order.client.dto.ActiveFlashSaleDto;
import com.ecommerce.order.client.dto.FlashSaleReserveRequest;
import com.ecommerce.order.client.dto.ProductResponse;
import com.ecommerce.order.client.dto.StockReservationItem;
import com.ecommerce.order.dto.request.CheckoutItemRequest;
import com.ecommerce.order.dto.request.CheckoutRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.DashboardResponse;
import com.ecommerce.order.dto.response.OrderItemResponse;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.dto.response.OrderStatusHistoryResponse;
import com.ecommerce.order.dto.response.PagedResponse;
import com.ecommerce.order.entity.Cart;
import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.OrderItem;
import com.ecommerce.order.entity.OrderStatusHistory;
import com.ecommerce.order.enums.OrderStatus;
import com.ecommerce.order.event.OrderEvent;
import com.ecommerce.order.event.PaymentFailedEvent;
import com.ecommerce.order.event.PaymentSuccessEvent;
import com.ecommerce.order.exception.AccessDeniedException;
import com.ecommerce.order.exception.ResourceNotFoundException;
import com.ecommerce.order.producer.KafkaOrderProducer;
import com.ecommerce.order.repository.CartRepository;
import com.ecommerce.order.repository.OrderRepository;
import com.ecommerce.order.repository.OrderStatusHistoryRepository;
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
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;

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

        // 1. Chống Price Tampering & Kiểm tra Flash Sale (giá ưu đãi + giới hạn mua userLimit)
        BigDecimal totalAmount = BigDecimal.ZERO;
        List<FlashSaleReserveRequest> flashSaleReservations = new ArrayList<>();
        Map<Long, Integer> flashSaleQtyByProduct = new HashMap<>();

        for (CheckoutItemRequest itemReq : request.getItems()) {
            ApiResponse<ProductResponse> productApiResponse = productClient.getProductById(itemReq.getProductId());
            if (productApiResponse == null || productApiResponse.getData() == null) {
                throw new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + itemReq.getProductId());
            }
            ProductResponse product = productApiResponse.getData();

            BigDecimal actualPrice = product.getPrice();
            if (product.getActiveFlashSale() != null) {
                ActiveFlashSaleDto activeFlashSale = product.getActiveFlashSale();
                int cumulativeQty = flashSaleQtyByProduct.merge(
                        itemReq.getProductId(), itemReq.getQuantity(), Integer::sum);

                if (activeFlashSale.getUserLimit() != null && cumulativeQty > activeFlashSale.getUserLimit()) {
                    throw new IllegalArgumentException(
                            "Sản phẩm '" + product.getName() + "' chỉ cho phép mua tối đa "
                                    + activeFlashSale.getUserLimit() + " sản phẩm với giá Flash Sale!");
                }

                if (activeFlashSale.getFlashSalePrice() != null) {
                    actualPrice = activeFlashSale.getFlashSalePrice();
                }

                flashSaleReservations.add(FlashSaleReserveRequest.builder()
                        .productId(itemReq.getProductId())
                        .quantity(itemReq.getQuantity())
                        .build());
            }

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

        // 2a. Trừ tồn kho Flash Sale nguyên tử trên Redis Lua (và cập nhật soldQuantity) nếu sản phẩm đang chạy Flash Sale
        for (FlashSaleReserveRequest fsReservation : flashSaleReservations) {
            log.info("Calling ProductClient reserveFlashSaleStock for productId={}, quantity={}",
                    fsReservation.getProductId(), fsReservation.getQuantity());
            productClient.reserveFlashSaleStock(fsReservation);
        }

        // 2b. Chuẩn bị danh sách trừ tồn kho và gọi FeignClient sang Product Service
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

        // [Task ECOM-171 / ECOM-187] Ghi nhận mốc lịch sử đầu tiên khi đơn hàng vừa được khởi tạo
        recordStatusHistory(savedOrder, OrderStatus.PENDING, null, "ORDER_CREATED",
                "CUSTOMER:" + savedOrder.getUserId(), "ROLE_CUSTOMER", "Đơn hàng đã được đặt thành công");

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

    /**
     * Hủy đơn hàng ở luồng nội bộ (system/job) — không kiểm tra quyền sở hữu.
     * KHÔNG expose qua Controller.
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public OrderResponse cancelOrder(Long orderId) {
        log.info("Processing internal (system) cancelOrder for orderId: {}", orderId);
        Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId));
        return cancelPendingOrderAndRestoreStock(order);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public OrderResponse cancelOrder(Long orderId, Long userId) {
        log.info("Processing cancelOrder for orderId: {}, userId: {}", orderId, userId);

        // Chống Authentication Bypass: bắt buộc phải xác định được người dùng
        if (userId == null) {
            throw new AccessDeniedException("Thiếu thông tin người dùng xác thực (X-User-Id)");
        }

        Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId));

        // Chống IDOR: chỉ chủ sở hữu mới được hủy đơn
        if (!userId.equals(order.getUserId())) {
            throw new AccessDeniedException("Bạn không có quyền hủy đơn hàng này");
        }

        return cancelPendingOrderAndRestoreStock(order);
    }

    /**
     * Logic hủy dùng chung: chỉ cho phép hủy khi PENDING, chuyển CANCELLED và hoàn tồn kho qua Feign.
     */
    private OrderResponse cancelPendingOrderAndRestoreStock(Order order) {
        Long orderId = order.getId();

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new IllegalStateException("Chỉ có thể hủy đơn hàng ở trạng thái PENDING. Trạng thái hiện tại: " + order.getStatus());
        }

        order.setStatus(OrderStatus.CANCELLED);
        Order updatedOrder = orderRepository.save(order);
        log.info("Order status updated to CANCELLED for orderId: {}", orderId);

        // [Task ECOM-171 / ECOM-187] Ghi nhận lịch sử trạng thái khi khách hàng hủy đơn hàng
        recordStatusHistory(updatedOrder, OrderStatus.CANCELLED, OrderStatus.PENDING, "ORDER_CANCELLED",
                order.getUserId() != null ? "CUSTOMER:" + order.getUserId() : "CUSTOMER",
                "ROLE_CUSTOMER", "Khách hàng hủy đơn hàng");

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

    /**
     * Lấy chi tiết đơn hàng ở luồng nội bộ — KHÔNG kiểm tra quyền. KHÔNG expose qua Controller.
     */
    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long id) {
        Order order = orderRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + id));
        return mapToOrderResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long id, Long authenticatedUserId, String roles) {
        boolean isAdmin = hasAdminRole(roles);

        // Chống Authentication Bypass: người dùng thường bắt buộc phải có danh tính
        if (authenticatedUserId == null && !isAdmin) {
            throw new AccessDeniedException("Bạn không có quyền xem chi tiết đơn hàng này");
        }

        Order order = orderRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + id));

        // Chống IDOR: chỉ chủ sở hữu hoặc ADMIN mới được xem
        if (!isAdmin && !authenticatedUserId.equals(order.getUserId())) {
            log.warn("IDOR attempt blocked: userId={} tried to read orderId={} owned by userId={}",
                    authenticatedUserId, id, order.getUserId());
            throw new AccessDeniedException("Bạn không có quyền xem chi tiết đơn hàng này");
        }

        return mapToOrderResponse(order);
    }

    /**
     * Lấy lịch sử đơn hàng ở luồng nội bộ — KHÔNG kiểm tra quyền. KHÔNG expose qua Controller.
     */
    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByUserId(Long userId) {
        List<Order> orders = orderRepository.findByUserIdWithItems(userId);
        return orders.stream()
                .map(this::mapToOrderResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByUserId(Long targetUserId, Long authenticatedUserId, String roles) {
        boolean isAdmin = hasAdminRole(roles);

        if (authenticatedUserId == null || (!authenticatedUserId.equals(targetUserId) && !isAdmin)) {
            log.warn("Order history access blocked: authenticatedUserId={} targetUserId={}", authenticatedUserId, targetUserId);
            throw new AccessDeniedException("Bạn không có quyền xem đơn hàng của người dùng khác");
        }

        return getOrdersByUserId(targetUserId);
    }

    /**
     * So khớp chính xác ROLE_ADMIN trong chuỗi roles (phân tách bởi dấu phẩy) do API Gateway truyền xuống,
     * tránh false-positive kiểu "ROLE_ADMIN_VIEWER".
     */
    private boolean hasAdminRole(String roles) {
        return roles != null && Arrays.stream(roles.split(","))
                .map(String::trim)
                .anyMatch("ROLE_ADMIN"::equals);
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
        Order savedOrder = orderRepository.save(order);
        log.info("[Saga Step] Order status successfully updated to PAID for orderId: {}", event.getOrderId());

        // [Task ECOM-171 / ECOM-187] Ghi nhận lịch sử thanh toán thành công
        recordStatusHistory(savedOrder, OrderStatus.PAID, OrderStatus.PENDING, "PAYMENT_SUCCESS",
                "PAYMENT_SERVICE", "SYSTEM", "Đã thanh toán thành công qua cổng thanh toán");
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

        OrderStatus previousStatus = order.getStatus();
        order.setStatus(OrderStatus.FAILED);
        Order savedOrder = orderRepository.save(order);
        log.info("[Saga Step] Order status updated to FAILED for orderId: {}", event.getOrderId());

        // [Task ECOM-171 / ECOM-187] Ghi nhận lịch sử thanh toán thất bại
        recordStatusHistory(savedOrder, OrderStatus.FAILED, previousStatus, "PAYMENT_FAILED",
                "PAYMENT_SERVICE", "SYSTEM", "Thanh toán thất bại: " + event.getReason());

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
        return updateOrderStatus(orderId, newStatus, "ADMIN", "ROLE_ADMIN", null);
    }

    /**
     * [Task ECOM-186 / ECOM-187 / ECOM-317] Admin cập nhật trạng thái đơn hàng:
     * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
     * - Task ECOM-186: Ràng buộc chuyển trạng thái theo State Machine (PENDING -> CONFIRMED -> SHIPPING -> DELIVERED),
     *   chặn mọi hành vi chuyển trạng thái trái phép hoặc quay lùi trạng thái.
     * - Task ECOM-187: Ghi lại actor, thời điểm và ghi chú vào bảng order_status_history.
     * - Task ECOM-317: Đồng bộ trạng thái đơn hàng giữa Admin và Customer trong cùng transaction.
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public OrderResponse updateOrderStatus(Long orderId, OrderStatus newStatus, String updatedBy, String actorRole, String note) {
        log.info("Admin updating order status for orderId: {} to {}, updatedBy: {}, note: {}", orderId, newStatus, updatedBy, note);

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

        // [Task ECOM-187 / ECOM-317] Ghi nhận lịch sử trạng thái kèm người cập nhật và ghi chú
        String logNote = (note != null && !note.trim().isEmpty())
                ? note.trim()
                : String.format("Admin cập nhật trạng thái đơn hàng từ %s sang %s", currentStatus, newStatus);

        recordStatusHistory(savedOrder, newStatus, currentStatus, "ADMIN_STATUS_UPDATE",
                updatedBy != null ? updatedBy : "ADMIN",
                actorRole != null ? actorRole : "ROLE_ADMIN",
                logNote);

        return mapToOrderResponse(savedOrder);
    }

    /**
     * [Task ECOM-315 / ECOM-171] Lấy dòng thời gian lịch sử trạng thái đơn hàng:
     * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
     * - Trả về danh sách OrderStatusHistoryResponse sắp xếp theo thời gian tăng dần.
     * - Kiểm tra quyền sở hữu đối với người dùng thông thường (chống IDOR). Admin được xem mọi đơn hàng.
     */
    @Override
    @Transactional(readOnly = true)
    public List<OrderStatusHistoryResponse> getOrderStatusHistory(Long orderId, Long authenticatedUserId, String roles) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId));

        boolean isAdmin = hasAdminRole(roles);

        if (!isAdmin && authenticatedUserId != null && !order.getUserId().equals(authenticatedUserId)) {
            throw new AccessDeniedException("Bạn không có quyền xem lịch sử đơn hàng của người dùng khác");
        }

        if (orderStatusHistoryRepository == null) {
            return List.of();
        }

        List<OrderStatusHistory> histories = orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(orderId);
        return histories.stream()
                .map(this::mapToStatusHistoryResponse)
                .toList();
    }

    /**
     * [Task ECOM-171 / ECOM-187] Helper ghi nhận bản ghi vào bảng order_status_history.
     */
    private OrderStatusHistory recordStatusHistory(Order order,
                                                   OrderStatus newStatus,
                                                   OrderStatus previousStatus,
                                                   String action,
                                                   String updatedBy,
                                                   String actorRole,
                                                   String note) {
        if (orderStatusHistoryRepository == null) {
            return null;
        }
        OrderStatusHistory history = OrderStatusHistory.builder()
                .order(order)
                .status(newStatus)
                .previousStatus(previousStatus)
                .action(action)
                .updatedBy(updatedBy != null ? updatedBy : "SYSTEM")
                .actorRole(actorRole != null ? actorRole : "SYSTEM")
                .note(note)
                .build();
        return orderStatusHistoryRepository.save(history);
    }

    private OrderStatusHistoryResponse mapToStatusHistoryResponse(OrderStatusHistory history) {
        return OrderStatusHistoryResponse.builder()
                .id(history.getId())
                .orderId(history.getOrder() != null ? history.getOrder().getId() : null)
                .status(history.getStatus())
                .statusDescription(OrderStatusHistoryResponse.getStatusDescription(history.getStatus()))
                .previousStatus(history.getPreviousStatus())
                .action(history.getAction())
                .updatedBy(history.getUpdatedBy())
                .actorRole(history.getActorRole())
                .note(history.getNote())
                .createdAt(history.getCreatedAt())
                .build();
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

        List<OrderStatusHistoryResponse> historyResponses = (order.getStatusHistories() != null && !order.getStatusHistories().isEmpty())
                ? order.getStatusHistories().stream().map(this::mapToStatusHistoryResponse).toList()
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
                .statusHistories(historyResponses)
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
