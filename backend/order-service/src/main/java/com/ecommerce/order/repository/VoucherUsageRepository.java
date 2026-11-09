package com.ecommerce.order.repository;

import com.ecommerce.order.entity.VoucherUsage;
import com.ecommerce.order.enums.VoucherUsageStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * [Task ECOM-166 / ECOM-167 / ECOM-183] Repository thao tác bảng voucher_usages.
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 */
@Repository
public interface VoucherUsageRepository extends JpaRepository<VoucherUsage, Long> {

    boolean existsByVoucherIdAndUserIdAndStatus(Long voucherId, Long userId, VoucherUsageStatus status);

    boolean existsByVoucherCodeIgnoreCaseAndUserIdAndStatus(String voucherCode, Long userId, VoucherUsageStatus status);

    Optional<VoucherUsage> findFirstByVoucherCodeIgnoreCaseAndOrderIdAndStatusOrderByIdDesc(
            String voucherCode, Long orderId, VoucherUsageStatus status);

    Optional<VoucherUsage> findFirstByVoucherCodeIgnoreCaseAndUserIdAndStatusOrderByIdDesc(
            String voucherCode, Long userId, VoucherUsageStatus status);

    List<VoucherUsage> findByUserIdAndStatus(Long userId, VoucherUsageStatus status);
}

