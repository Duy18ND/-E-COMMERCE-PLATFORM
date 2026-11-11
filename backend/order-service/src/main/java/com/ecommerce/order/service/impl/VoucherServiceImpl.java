package com.ecommerce.order.service.impl;

import com.ecommerce.order.dto.request.ApplyVoucherRequest;
import com.ecommerce.order.dto.request.VoucherRequest;
import com.ecommerce.order.dto.response.ApplyVoucherResponse;
import com.ecommerce.order.dto.response.VoucherResponse;
import com.ecommerce.order.entity.Voucher;
import com.ecommerce.order.entity.VoucherUsage;
import com.ecommerce.order.enums.DiscountType;
import com.ecommerce.order.enums.VoucherStatus;
import com.ecommerce.order.enums.VoucherUsageStatus;
import com.ecommerce.order.exception.DuplicateResourceException;
import com.ecommerce.order.exception.ResourceNotFoundException;
import com.ecommerce.order.repository.VoucherRepository;
import com.ecommerce.order.repository.VoucherUsageRepository;
import com.ecommerce.order.service.VoucherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

/**
 * [Task ECOM-166 / ECOM-167 / ECOM-183 / ECOM-339] Triển khai nghiệp vụ quản lý và áp dụng Voucher & mã giảm giá.
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VoucherServiceImpl implements VoucherService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final VoucherRepository voucherRepository;

    @Autowired(required = false)
    private VoucherUsageRepository voucherUsageRepository;

    private Clock clock = Clock.system(VIETNAM_ZONE);

    /**
     * [Task ECOM-185] Khóa đồng bộ theo cặp (voucherCode, userId) và tập theo dõi giao dịch đang xử lý (in-flight)
     * để ngăn chặn 1 người dùng gửi nhiều request đồng thời vượt giới hạn sử dụng cá nhân (TOCTOU race condition).
     */
    private final ConcurrentHashMap<String, ReentrantLock> userVoucherLocks = new ConcurrentHashMap<>();
    private final Set<String> inFlightUserVouchers = ConcurrentHashMap.newKeySet();
    private final ConcurrentHashMap<String, ReentrantLock> orderRestoreLocks = new ConcurrentHashMap<>();

    public void setVoucherUsageRepository(VoucherUsageRepository voucherUsageRepository) {
        this.voucherUsageRepository = voucherUsageRepository;
    }

    @Autowired(required = false)
    public void setClock(Clock clock) {
        this.clock = (clock != null) ? clock : Clock.system(VIETNAM_ZONE);
    }

    public Clock getClock() {
        return this.clock;
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoucherResponse> getAllVouchers() {
        return voucherRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::mapToVoucherResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public VoucherResponse getVoucherById(Long id) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với ID: " + id));
        return mapToVoucherResponse(voucher);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public VoucherResponse createVoucher(VoucherRequest request) {
        validateDateRange(request.getStartDate(), request.getEndDate());
        String code = request.getCode().trim().toUpperCase();
        if (voucherRepository.existsByCodeIgnoreCase(code)) {
            throw new DuplicateResourceException("Mã voucher '" + code + "' đã tồn tại trong hệ thống");
        }

        Voucher voucher = Voucher.builder()
                .code(code)
                .name(request.getName().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .maxDiscount(request.getMaxDiscount())
                .minOrderValue(request.getMinOrderValue() != null ? request.getMinOrderValue() : BigDecimal.ZERO)
                .quantity(request.getQuantity())
                .usedQuantity(0)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(request.getStatus() != null ? request.getStatus() : VoucherStatus.ACTIVE)
                .build();

        Voucher saved = voucherRepository.save(voucher);
        log.info("Admin created voucher successfully: code={}, id={}", saved.getCode(), saved.getId());
        return mapToVoucherResponse(saved);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public VoucherResponse updateVoucher(Long id, VoucherRequest request) {
        validateDateRange(request.getStartDate(), request.getEndDate());
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với ID: " + id));

        String code = request.getCode().trim().toUpperCase();
        if (voucherRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new DuplicateResourceException("Mã voucher '" + code + "' đã tồn tại trong hệ thống");
        }

        if (request.getQuantity() < voucher.getUsedQuantity()) {
            throw new IllegalStateException("Số lượng mã (" + request.getQuantity() +
                    ") không được nhỏ hơn số lượt đã sử dụng (" + voucher.getUsedQuantity() + ")");
        }

        voucher.setCode(code);
        voucher.setName(request.getName().trim());
        voucher.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        voucher.setDiscountType(request.getDiscountType());
        voucher.setDiscountValue(request.getDiscountValue());
        voucher.setMaxDiscount(request.getMaxDiscount());
        voucher.setMinOrderValue(request.getMinOrderValue() != null ? request.getMinOrderValue() : BigDecimal.ZERO);
        voucher.setQuantity(request.getQuantity());
        voucher.setStartDate(request.getStartDate());
        voucher.setEndDate(request.getEndDate());
        if (request.getStatus() != null) {
            voucher.setStatus(request.getStatus());
        }

        Voucher updated = voucherRepository.save(voucher);
        log.info("Admin updated voucher successfully: code={}, id={}", updated.getCode(), updated.getId());
        return mapToVoucherResponse(updated);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public VoucherResponse toggleVoucherStatus(Long id) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với ID: " + id));

        VoucherStatus newStatus = (voucher.getStatus() == VoucherStatus.ACTIVE)
                ? VoucherStatus.INACTIVE
                : VoucherStatus.ACTIVE;
        voucher.setStatus(newStatus);

        Voucher updated = voucherRepository.save(voucher);
        log.info("Admin toggled voucher status: id={}, newStatus={}", id, newStatus);
        return mapToVoucherResponse(updated);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteVoucher(Long id) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với ID: " + id));
        voucherRepository.delete(voucher);
        log.info("Admin deleted voucher successfully: id={}, code={}", id, voucher.getCode());
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoucherResponse> getActiveVouchers() {
        LocalDate today = LocalDate.now(clock);
        return voucherRepository.findAvailableForCustomer(VoucherStatus.ACTIVE, today)
                .stream()
                .map(this::mapToVoucherResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoucherResponse> getAvailableVouchersForUser(Long userId) {
        List<VoucherResponse> activeVouchers = getActiveVouchers();
        if (userId == null || voucherUsageRepository == null) {
            return activeVouchers;
        }
        Set<Long> usedVoucherIds = voucherUsageRepository.findByUserIdAndStatus(userId, VoucherUsageStatus.APPLIED)
                .stream()
                .map(VoucherUsage::getVoucherId)
                .collect(Collectors.toSet());
        if (usedVoucherIds.isEmpty()) {
            return activeVouchers;
        }
        return activeVouchers.stream()
                .filter(v -> v.getId() == null || !usedVoucherIds.contains(v.getId()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ApplyVoucherResponse applyVoucher(ApplyVoucherRequest request) {
        if (request == null || request.getCode() == null || request.getCode().trim().isEmpty()) {
            throw new IllegalArgumentException("Mã giảm giá không được để trống");
        }
        String code = request.getCode().trim().toUpperCase();
        LocalDate today = LocalDate.now(clock);

        Voucher voucher = voucherRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new ResourceNotFoundException("Mã giảm giá không tồn tại: " + code));

        // [Task ECOM-167] Chặn dùng trùng: kiểm tra người dùng hiện tại đã áp dụng mã này chưa
        validateUserNotAlreadyUsed(voucher, request.getUserId());

        BigDecimal discount = calculateAndValidateDiscount(voucher, request.getOrderTotal(), today);
        BigDecimal finalAmount = request.getOrderTotal().subtract(discount).max(BigDecimal.ZERO);

        return ApplyVoucherResponse.builder()
                .voucher(mapToVoucherResponse(voucher))
                .discountAmount(discount)
                .finalAmount(finalAmount)
                .build();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BigDecimal redeemVoucherForOrder(String rawCode, BigDecimal subtotalAmount) {
        if (rawCode == null || rawCode.trim().isEmpty()) {
            return BigDecimal.ZERO;
        }

        String code = rawCode.trim().toUpperCase();
        LocalDate today = LocalDate.now(clock);

        Voucher voucher = voucherRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new ResourceNotFoundException("Mã giảm giá không tồn tại: " + code));

        BigDecimal discount = calculateAndValidateDiscount(voucher, subtotalAmount, today);

        // Atomic conditional update: chỉ trừ 1 lượt nếu thỏa điều kiện còn hạn, ACTIVE và usedQuantity < quantity
        int updated = voucherRepository.incrementUsedQuantityAtomically(voucher.getId(), today);
        if (updated == 0) {
            log.warn("Voucher redemption failed (exhausted or expired): code={}, subtotal={}", code, subtotalAmount);
            throw new IllegalStateException("Mã giảm giá vừa hết lượt sử dụng hoặc đã hết hiệu lực.");
        }

        log.info("Voucher redeemed successfully: code={}, discountAmount={}, subtotal={}", code, discount, subtotalAmount);
        return discount;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BigDecimal redeemVoucherForOrder(String rawCode, BigDecimal subtotalAmount, Long userId, Long orderId) {
        if (rawCode == null || rawCode.trim().isEmpty()) {
            return BigDecimal.ZERO;
        }
        if (userId != null) {
            String key = rawCode.trim().toUpperCase() + "#" + userId;
            ReentrantLock lock = userVoucherLocks.computeIfAbsent(key, k -> new ReentrantLock());
            lock.lock();
            try {
                validateUserCanUseVoucher(rawCode, userId);
                BigDecimal discount = redeemVoucherForOrder(rawCode, subtotalAmount);
                recordVoucherUsage(rawCode, userId, orderId, discount);
                return discount;
            } finally {
                lock.unlock();
            }
        }
        validateUserCanUseVoucher(rawCode, userId);
        BigDecimal discount = redeemVoucherForOrder(rawCode, subtotalAmount);
        recordVoucherUsage(rawCode, userId, orderId, discount);
        return discount;
    }

    @Override
    @Transactional(readOnly = true)
    public void validateUserCanUseVoucher(String rawCode, Long userId) {
        if (rawCode == null || rawCode.trim().isEmpty() || userId == null || voucherUsageRepository == null) {
            return;
        }
        String code = rawCode.trim().toUpperCase();
        String userVoucherKey = code + "#" + userId;
        ReentrantLock lock = userVoucherLocks.computeIfAbsent(userVoucherKey, k -> new ReentrantLock());
        lock.lock();
        try {
            if (inFlightUserVouchers.contains(userVoucherKey)
                    || voucherUsageRepository.existsByVoucherCodeIgnoreCaseAndUserIdAndStatus(
                            code, userId, VoucherUsageStatus.APPLIED)) {
                log.warn("Duplicate voucher usage blocked for userId={}, code={}", userId, code);
                throw new IllegalStateException("Bạn đã sử dụng mã giảm giá này rồi.");
            }
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                inFlightUserVouchers.add(userVoucherKey);
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        inFlightUserVouchers.remove(userVoucherKey);
                    }
                });
            }
        } finally {
            lock.unlock();
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void recordVoucherUsage(String rawCode, Long userId, Long orderId, BigDecimal discountAmount) {
        if (rawCode == null || rawCode.trim().isEmpty() || userId == null || voucherUsageRepository == null) {
            return;
        }
        String code = rawCode.trim().toUpperCase();
        Long voucherId = voucherRepository.findByCodeIgnoreCase(code)
                .map(Voucher::getId)
                .orElse(0L);

        VoucherUsage usage = VoucherUsage.builder()
                .voucherId(voucherId)
                .voucherCode(code)
                .userId(userId)
                .orderId(orderId)
                .discountAmount(discountAmount != null ? discountAmount : BigDecimal.ZERO)
                .status(VoucherUsageStatus.APPLIED)
                .build();
        voucherUsageRepository.save(usage);
        log.info("Recorded voucher usage: code={}, userId={}, orderId={}, discount={}", code, userId, orderId, discountAmount);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void restoreVoucherUsage(String voucherCode) {
        if (voucherCode == null || voucherCode.trim().isEmpty()) {
            return;
        }
        String code = voucherCode.trim().toUpperCase();
        int rows = voucherRepository.decrementUsedQuantityByCode(code);
        log.info("Restored voucher usage for code={}: affected rows={}", code, rows);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void restoreVoucherUsageForOrder(String voucherCode, Long userId, Long orderId) {
        if (voucherCode == null || voucherCode.trim().isEmpty() || voucherUsageRepository == null) {
            return;
        }
        String code = voucherCode.trim().toUpperCase();
        String lockKey = code + "#" + (orderId != null ? "ORDER:" + orderId : "USER:" + userId);
        ReentrantLock lock = orderRestoreLocks.computeIfAbsent(lockKey, k -> new ReentrantLock());
        lock.lock();
        try {
            Optional<VoucherUsage> usageOpt = Optional.empty();
            if (orderId != null) {
                usageOpt = voucherUsageRepository.findFirstByVoucherCodeIgnoreCaseAndOrderIdAndStatusOrderByIdDesc(
                        code, orderId, VoucherUsageStatus.APPLIED);
            } else if (userId != null) {
                usageOpt = voucherUsageRepository.findFirstByVoucherCodeIgnoreCaseAndUserIdAndStatusOrderByIdDesc(
                        code, userId, VoucherUsageStatus.APPLIED);
            }
            usageOpt.ifPresent(usage -> {
                usage.setStatus(VoucherUsageStatus.RESTORED);
                voucherUsageRepository.save(usage);
                log.info("Restored voucher_usages record id={} to RESTORED for code={}, userId={}, orderId={}",
                        usage.getId(), code, userId, orderId);
            });
        } finally {
            lock.unlock();
        }
    }

    private void validateUserNotAlreadyUsed(Voucher voucher, Long userId) {
        if (userId == null || voucherUsageRepository == null) {
            return;
        }
        String userVoucherKey = voucher.getCode().trim().toUpperCase() + "#" + userId;
        boolean alreadyUsed = inFlightUserVouchers.contains(userVoucherKey)
                || (voucher.getId() != null && voucherUsageRepository.existsByVoucherIdAndUserIdAndStatus(
                voucher.getId(), userId, VoucherUsageStatus.APPLIED))
                || voucherUsageRepository.existsByVoucherCodeIgnoreCaseAndUserIdAndStatus(
                voucher.getCode(), userId, VoucherUsageStatus.APPLIED);
        if (alreadyUsed) {
            throw new IllegalStateException("Bạn đã sử dụng mã giảm giá này rồi.");
        }
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("Ngày bắt đầu và ngày kết thúc không được để trống");
        }
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu");
        }
    }

    private BigDecimal calculateAndValidateDiscount(Voucher voucher, BigDecimal orderTotal, LocalDate today) {
        if (voucher.getStartDate() == null || voucher.getEndDate() == null
                || voucher.getEndDate().isBefore(voucher.getStartDate())) {
            throw new IllegalStateException("Cấu hình thời hạn mã giảm giá không hợp lệ.");
        }
        if (voucher.getStatus() != VoucherStatus.ACTIVE) {
            throw new IllegalStateException("Mã giảm giá không còn hiệu lực.");
        }
        if (today.isBefore(voucher.getStartDate())) {
            throw new IllegalStateException("Mã giảm giá chưa đến thời gian áp dụng.");
        }
        if (today.isAfter(voucher.getEndDate())) {
            throw new IllegalStateException("Mã giảm giá đã hết hạn.");
        }
        if (voucher.getUsedQuantity() >= voucher.getQuantity()) {
            throw new IllegalStateException("Mã giảm giá đã hết lượt sử dụng.");
        }
        if (orderTotal == null || orderTotal.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Tổng tiền đơn hàng phải lớn hơn 0đ để áp dụng mã giảm giá.");
        }
        BigDecimal minOrderValue = voucher.getMinOrderValue() != null ? voucher.getMinOrderValue() : BigDecimal.ZERO;
        if (orderTotal.compareTo(minOrderValue) < 0) {
            throw new IllegalStateException("Đơn hàng tối thiểu " + minOrderValue + "đ để sử dụng mã này.");
        }

        BigDecimal discount;
        if (voucher.getDiscountType() == DiscountType.FIXED) {
            discount = voucher.getDiscountValue();
        } else {
            discount = orderTotal.multiply(voucher.getDiscountValue())
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            if (voucher.getMaxDiscount() != null && discount.compareTo(voucher.getMaxDiscount()) > 0) {
                discount = voucher.getMaxDiscount();
            }
        }

        return discount.min(orderTotal);
    }

    private VoucherResponse mapToVoucherResponse(Voucher voucher) {
        return VoucherResponse.builder()
                .id(voucher.getId())
                .code(voucher.getCode())
                .name(voucher.getName())
                .description(voucher.getDescription())
                .discountType(voucher.getDiscountType())
                .discountValue(voucher.getDiscountValue())
                .maxDiscount(voucher.getMaxDiscount())
                .minOrderValue(voucher.getMinOrderValue())
                .quantity(voucher.getQuantity())
                .usedQuantity(voucher.getUsedQuantity())
                .startDate(voucher.getStartDate())
                .endDate(voucher.getEndDate())
                .status(voucher.getStatus())
                .createdAt(voucher.getCreatedAt())
                .updatedAt(voucher.getUpdatedAt())
                .build();
    }
}

