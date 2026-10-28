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
}
