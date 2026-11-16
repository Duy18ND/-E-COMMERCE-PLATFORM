package com.ecommerce.order.repository;

import com.ecommerce.order.entity.Order;
import com.ecommerce.order.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    /**
     * Lấy chi tiết đơn hàng kèm danh sách sản phẩm bằng LEFT JOIN FETCH
     * để tránh hoàn toàn lỗi N+1 query.
     */
    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.orderItems WHERE o.id = :id")
    Optional<Order> findByIdWithItems(@Param("id") Long id);

    /**
     * Lấy toàn bộ đơn hàng của người dùng kèm danh sách sản phẩm.
     */
    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.orderItems WHERE o.userId = :userId ORDER BY o.createdAt DESC")
    List<Order> findByUserIdWithItems(@Param("userId") Long userId);

    /**
     * Lấy danh sách đơn hàng có phân trang theo trạng thái (dành cho Admin).
     */
    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    /**
     * Đếm tổng số đơn hàng trong toàn hệ thống.
     */
    @Query("SELECT COUNT(o) FROM Order o")
    Long countTotalOrders();

    /**
     * Tính tổng doanh thu trực tiếp dưới DB của các đơn hàng có trạng thái thuộc danh sách chỉ định.
     */
    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status IN :statuses")
    BigDecimal sumTotalAmountByStatusIn(@Param("statuses") Collection<OrderStatus> statuses);

    /**
     * Đếm số lượng đơn hàng gom nhóm theo từng trạng thái bằng GROUP BY trực tiếp dưới DB.
     */
    @Query("SELECT o.status, COUNT(o) FROM Order o GROUP BY o.status")
    List<Object[]> countOrdersByStatusGroup();

    /**
     * [Task ECOM-145 / ECOM-326] Đếm tổng số đơn hàng trong khoảng thời gian chỉ định.
     * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
     */
    @Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt >= :startDate AND o.createdAt <= :endDate")
    Long countTotalOrdersBetween(@Param("startDate") LocalDateTime startDate,
                                 @Param("endDate") LocalDateTime endDate);

    /**
     * [Task ECOM-145 / ECOM-326] Tính tổng doanh thu của các đơn hàng hợp lệ trong khoảng thời gian chỉ định.
     * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
     */
    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o " +
           "WHERE o.status IN :statuses AND o.createdAt >= :startDate AND o.createdAt <= :endDate")
    BigDecimal sumTotalAmountByStatusInAndCreatedAtBetween(@Param("statuses") Collection<OrderStatus> statuses,
                                                           @Param("startDate") LocalDateTime startDate,
                                                           @Param("endDate") LocalDateTime endDate);

    /**
     * [Task ECOM-145 / ECOM-326] Đếm số lượng đơn hàng gom nhóm theo từng trạng thái trong khoảng thời gian chỉ định.
     * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
     */
    @Query("SELECT o.status, COUNT(o) FROM Order o " +
           "WHERE o.createdAt >= :startDate AND o.createdAt <= :endDate GROUP BY o.status")
    List<Object[]> countOrdersByStatusGroupBetween(@Param("startDate") LocalDateTime startDate,
                                                   @Param("endDate") LocalDateTime endDate);

    /**
     * Tính tổng số lượng sản phẩm userId đã mua trong khung thời gian chiến dịch Flash Sale
     * (chỉ tính các đơn không bị hủy/thất bại để chống lách userLimit qua nhiều đơn).
     */
    @Query("SELECT COALESCE(SUM(oi.quantity), 0) FROM OrderItem oi " +
           "JOIN oi.order o " +
           "WHERE o.userId = :userId " +
           "AND oi.productId = :productId " +
           "AND o.status NOT IN :excludedStatuses " +
           "AND o.createdAt >= :startDate " +
           "AND o.createdAt <= :endDate")
    Integer sumPurchasedQuantityByUserAndProductBetween(
            @Param("userId") Long userId,
            @Param("productId") Long productId,
            @Param("excludedStatuses") Collection<OrderStatus> excludedStatuses,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);
}
