package com.ecommerce.order.service.impl;

import com.ecommerce.order.dto.request.ApplyVoucherRequest;
import com.ecommerce.order.dto.request.VoucherRequest;
import com.ecommerce.order.dto.response.ApplyVoucherResponse;
import com.ecommerce.order.dto.response.VoucherResponse;
import com.ecommerce.order.entity.Voucher;
import com.ecommerce.order.enums.DiscountType;
import com.ecommerce.order.enums.VoucherStatus;
import com.ecommerce.order.exception.DuplicateResourceException;
import com.ecommerce.order.exception.ResourceNotFoundException;
import com.ecommerce.order.repository.VoucherRepository;
import com.ecommerce.order.service.VoucherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class VoucherServiceImpl implements VoucherService {

    private final VoucherRepository voucherRepository;

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
        LocalDate today = LocalDate.now();
        return voucherRepository.findAvailableForCustomer(VoucherStatus.ACTIVE, today)
                .stream()
                .map(this::mapToVoucherResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ApplyVoucherResponse applyVoucher(ApplyVoucherRequest request) {
        String code = request.getCode().trim().toUpperCase();
        LocalDate today = LocalDate.now();

        Voucher voucher = voucherRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new ResourceNotFoundException("Mã giảm giá không tồn tại: " + code));

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
        LocalDate today = LocalDate.now();

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
    public void restoreVoucherUsage(String voucherCode) {
        if (voucherCode == null || voucherCode.trim().isEmpty()) {
            return;
        }
        String code = voucherCode.trim().toUpperCase();
        int rows = voucherRepository.decrementUsedQuantityByCode(code);
        log.info("Restored voucher usage for code={}: affected rows={}", code, rows);
    }

    private BigDecimal calculateAndValidateDiscount(Voucher voucher, BigDecimal orderTotal, LocalDate today) {
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
        if (orderTotal == null || orderTotal.compareTo(voucher.getMinOrderValue()) < 0) {
            throw new IllegalStateException("Đơn hàng tối thiểu " + voucher.getMinOrderValue() + "đ để sử dụng mã này.");
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

