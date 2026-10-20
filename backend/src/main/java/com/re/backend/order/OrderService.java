package com.re.backend.order;

import com.re.backend.cart.Cart;
import com.re.backend.cart.CartItem;
import com.re.backend.cart.CartRepository;
import com.re.backend.payment.Payment;
import com.re.backend.payment.PaymentMethod;
import com.re.backend.payment.PaymentRepository;
import com.re.backend.payment.PaymentStatus;
import com.re.backend.product.Product;
import com.re.backend.product.ProductRepository;
import com.re.backend.user.User;
import com.re.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    // ─────────────────────────────────────────────────────────────
    // CHECKOUT
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public OrderResponse checkoutOrder(String email, CheckoutRequest request) {
        // 1. Lấy giỏ hàng (bao gồm items + product)
        Cart cart = cartRepository.findByUserEmailWithItems(email)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giỏ hàng"));

        if (cart.getItems().isEmpty()) {
            throw new IllegalArgumentException("Giỏ hàng đang trống, không thể đặt hàng");
        }

        // 2. Kiểm tra tồn kho từng sản phẩm
        for (CartItem item : cart.getItems()) {
            Product product = item.getProduct();
            if (product.getStockQuantity() < item.getQuantity()) {
                throw new IllegalArgumentException(
                        "Sản phẩm '" + product.getName() + "' chỉ còn " +
                        product.getStockQuantity() + " trong kho (yêu cầu: " + item.getQuantity() + ")");
            }
        }

        // 3. Tạo Order + OrderItems, trừ tồn kho
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy user"));

        Order order = Order.builder()
                .user(user)
                .status(OrderStatus.PENDING)
                .shippingAddress(request.getShippingAddress())
                .receiverName(request.getReceiverName())
                .receiverPhone(request.getReceiverPhone())
                .note(request.getNote())
                .totalAmount(BigDecimal.ZERO)
                .build();

        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (CartItem cartItem : cart.getItems()) {
            Product product = cartItem.getProduct();

            // Trừ tồn kho
            product.setStockQuantity(product.getStockQuantity() - cartItem.getQuantity());
            productRepository.save(product);

            // Tạo OrderItem
            BigDecimal price = product.getPrice();
            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .product(product)
                    .quantity(cartItem.getQuantity())
                    .priceAtPurchase(price)
                    .build();
            orderItems.add(orderItem);

            totalAmount = totalAmount.add(price.multiply(BigDecimal.valueOf(cartItem.getQuantity())));
        }

        order.setTotalAmount(totalAmount);
        order.setItems(orderItems);
        Order savedOrder = orderRepository.save(order);

        // 4. Tạo Payment gắn với Order (trạng thái PENDING)
        Payment payment = Payment.builder()
                .order(savedOrder)
                .paymentMethod(request.getPaymentMethod())
                .amount(totalAmount)
                .status(PaymentStatus.PENDING)
                .build();
        paymentRepository.save(payment);

        // 5. Xóa sạch giỏ hàng sau khi đặt hàng thành công
        cart.getItems().clear();
        cartRepository.save(cart);

        return toOrderResponse(savedOrder);
    }

    // ─────────────────────────────────────────────────────────────
    // USER: Lấy lịch sử đơn hàng
    // ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrders(String email) {
        return orderRepository.findByUserEmailWithItems(email)
                .stream()
                .map(this::toOrderResponse)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────
    // USER / ADMIN: Xem chi tiết đơn hàng (kiểm tra quyền sở hữu)
    // ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long orderId, String email, boolean isAdmin) {
        Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId));

        if (!isAdmin && !order.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("Bạn không có quyền xem đơn hàng này");
        }
        return toOrderResponse(order);
    }

    // ─────────────────────────────────────────────────────────────
    // USER: Hủy đơn khi PENDING
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public OrderResponse cancelOrder(Long orderId, String email) {
        Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId));

        if (!order.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("Bạn không có quyền hủy đơn hàng này");
        }
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Chỉ có thể hủy đơn hàng đang ở trạng thái PENDING. " +
                    "Trạng thái hiện tại: " + order.getStatus());
        }

        restoreStock(order);
        order.setStatus(OrderStatus.CANCELLED);
        return toOrderResponse(orderRepository.save(order));
    }

    // ─────────────────────────────────────────────────────────────
    // ADMIN: Lấy tất cả đơn hàng (có filter theo status)
    // ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders(String statusParam) {
        if (statusParam != null && !statusParam.isBlank()) {
            try {
                OrderStatus status = OrderStatus.valueOf(statusParam.toUpperCase());
                return orderRepository.findByStatusWithItems(status)
                        .stream().map(this::toOrderResponse).collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Trạng thái không hợp lệ: " + statusParam);
            }
        }
        return orderRepository.findAllWithItemsOrderByCreatedAtDesc()
                .stream().map(this::toOrderResponse).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────
    // ADMIN: Cập nhật trạng thái đơn hàng (hoàn kho nếu CANCELLED)
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, OrderStatus newStatus) {
        Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId));

        OrderStatus oldStatus = order.getStatus();

        // Hoàn kho nếu chuyển sang CANCELLED mà trước đó chưa bị hủy
        if (newStatus == OrderStatus.CANCELLED && oldStatus != OrderStatus.CANCELLED) {
            restoreStock(order);
            // Cập nhật payment về REFUNDED nếu đã SUCCESS
            paymentRepository.findByOrderId(orderId).ifPresent(payment -> {
                if (payment.getStatus() == com.re.backend.payment.PaymentStatus.SUCCESS) {
                    payment.setStatus(com.re.backend.payment.PaymentStatus.REFUNDED);
                    paymentRepository.save(payment);
                }
            });
        }

        order.setStatus(newStatus);
        return toOrderResponse(orderRepository.save(order));
    }

    // ─────────────────────────────────────────────────────────────
    // ADMIN: Thống kê Dashboard
    // ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public OrderStatsResponse getOrderStats() {
        List<OrderStatus> revenueStatuses = List.of(OrderStatus.PAID, OrderStatus.COMPLETED);
        return OrderStatsResponse.builder()
                .totalOrders(orderRepository.count())
                .totalRevenue(orderRepository.calculateTotalRevenue(revenueStatuses))
                .pendingCount(orderRepository.countByStatus(OrderStatus.PENDING))
                .paidCount(orderRepository.countByStatus(OrderStatus.PAID))
                .shippingCount(orderRepository.countByStatus(OrderStatus.SHIPPING))
                .completedCount(orderRepository.countByStatus(OrderStatus.COMPLETED))
                .cancelledCount(orderRepository.countByStatus(OrderStatus.CANCELLED))
                .totalUsers(userRepository.count())
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────

    /** Hoàn trả tồn kho cho tất cả sản phẩm trong đơn hàng */
    private void restoreStock(Order order) {
        for (OrderItem item : order.getItems()) {
            Product product = item.getProduct();
            product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
            productRepository.save(product);
        }
    }

    /** Chuyển Order entity → OrderResponse DTO (không lộ entity ra ngoài) */
    public OrderResponse toOrderResponse(Order order) {
        List<OrderItemResponse> itemResponses = order.getItems().stream()
                .map(item -> OrderItemResponse.builder()
                        .itemId(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .imageUrl(item.getProduct().getImageUrl())
                        .quantity(item.getQuantity())
                        .priceAtPurchase(item.getPriceAtPurchase())
                        .subTotal(item.getPriceAtPurchase()
                                .multiply(BigDecimal.valueOf(item.getQuantity())))
                        .build())
                .collect(Collectors.toList());

        return OrderResponse.builder()
                .id(order.getId())
                .userEmail(order.getUser().getEmail())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus().name())
                .shippingAddress(order.getShippingAddress())
                .receiverName(order.getReceiverName())
                .receiverPhone(order.getReceiverPhone())
                .note(order.getNote())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .items(itemResponses)
                .build();
    }
}
