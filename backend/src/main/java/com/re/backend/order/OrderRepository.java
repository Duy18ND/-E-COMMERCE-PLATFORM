package com.re.backend.order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    /**
     * Lấy đơn hàng của 1 user kèm items + product trong 1 query (tránh N+1).
     */
    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.items i " +
           "LEFT JOIN FETCH i.product " +
           "WHERE o.user.email = :email " +
           "ORDER BY o.createdAt DESC")
    List<Order> findByUserEmailWithItems(@Param("email") String email);

    /**
     * Lấy tất cả đơn hàng (Admin) kèm items + product, sắp xếp mới nhất trước.
     */
    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.items i " +
           "LEFT JOIN FETCH i.product " +
           "LEFT JOIN FETCH o.user " +
           "ORDER BY o.createdAt DESC")
    List<Order> findAllWithItemsOrderByCreatedAtDesc();

    /**
     * Admin filter theo status.
     */
    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.items i " +
           "LEFT JOIN FETCH i.product " +
           "LEFT JOIN FETCH o.user " +
           "WHERE o.status = :status " +
           "ORDER BY o.createdAt DESC")
    List<Order> findByStatusWithItems(@Param("status") OrderStatus status);

    /**
     * Tìm đơn hàng theo id, fetch sẵn items + product.
     */
    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.items i " +
           "LEFT JOIN FETCH i.product " +
           "LEFT JOIN FETCH o.user " +
           "WHERE o.id = :id")
    Optional<Order> findByIdWithItems(@Param("id") Long id);

    // ── Stats queries ──────────────────────────────────────────────

    long countByStatus(OrderStatus status);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status IN :statuses")
    BigDecimal calculateTotalRevenue(@Param("statuses") List<OrderStatus> statuses);
}
