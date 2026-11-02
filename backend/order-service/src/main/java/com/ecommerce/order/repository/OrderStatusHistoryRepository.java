package com.ecommerce.order.repository;

import com.ecommerce.order.entity.OrderStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * [Task ECOM-171 / ECOM-315] Repository truy vấn nhật ký lịch sử trạng thái đơn hàng.
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 */
@Repository
public interface OrderStatusHistoryRepository extends JpaRepository<OrderStatusHistory, Long> {

    /**
     * Lấy danh sách lịch sử chuyển đổi trạng thái theo ID đơn hàng theo thứ tự thời gian tăng dần (Timeline).
     */
    List<OrderStatusHistory> findByOrderIdOrderByCreatedAtAsc(Long orderId);

    /**
     * Lấy danh sách lịch sử chuyển đổi trạng thái theo ID đơn hàng theo thứ tự thời gian mới nhất trước.
     */
    List<OrderStatusHistory> findByOrderIdOrderByCreatedAtDesc(Long orderId);

    /**
     * Lấy bản ghi trạng thái gần nhất của đơn hàng.
     */
    Optional<OrderStatusHistory> findTopByOrderIdOrderByCreatedAtDesc(Long orderId);
}

