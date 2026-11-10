package com.ecommerce.order.repository;

import com.ecommerce.order.entity.Voucher;
import com.ecommerce.order.enums.VoucherStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * [Task ECOM-166 / ECOM-167 / ECOM-183 / ECOM-339] Repository thao tác bảng vouchers.
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 */
@Repository
public interface VoucherRepository extends JpaRepository<Voucher, Long> {

    Optional<Voucher> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    @Query("SELECT v FROM Voucher v WHERE v.status = :status " +
           "AND v.startDate <= :today AND v.endDate >= :today " +
           "AND v.usedQuantity < v.quantity ORDER BY v.createdAt DESC")
    List<Voucher> findAvailableForCustomer(@Param("status") VoucherStatus status, @Param("today") LocalDate today);

    /**
     * Tăng lượt sử dụng nguyên tử (Atomic Conditional Update) chống Race Condition khi nhiều đơn cùng áp mã.
     * Chỉ tăng khi voucher đang ACTIVE, còn trong thời hạn và usedQuantity < quantity.
     * Trả về số dòng cập nhật (1 = thành công, 0 = thất bại / hết lượt).
     */
    @Modifying
    @Query("UPDATE Voucher v SET v.usedQuantity = v.usedQuantity + 1 " +
           "WHERE v.id = :id AND v.status = 'ACTIVE' " +
           "AND v.startDate <= :today AND v.endDate >= :today " +
           "AND v.usedQuantity < v.quantity")
    int incrementUsedQuantityAtomically(@Param("id") Long id, @Param("today") LocalDate today);

    /**
     * Hoàn lại 1 lượt sử dụng khi đơn hàng bị hủy hoặc thanh toán thất bại.
     */
    @Modifying
    @Query("UPDATE Voucher v SET v.usedQuantity = v.usedQuantity - 1 " +
           "WHERE UPPER(v.code) = UPPER(:code) AND v.usedQuantity > 0")
    int decrementUsedQuantityByCode(@Param("code") String code);
}

