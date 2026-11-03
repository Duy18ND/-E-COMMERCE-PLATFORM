package com.ecommerce.order.service;

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
import com.ecommerce.order.service.impl.VoucherServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VoucherServiceTest {

    @Mock
    private VoucherRepository voucherRepository;

    @InjectMocks
    private VoucherServiceImpl voucherService;

    private Voucher sampleFixedVoucher;
    private Voucher samplePercentVoucher;

    @BeforeEach
    void setUp() {
        sampleFixedVoucher = Voucher.builder()
                .id(1L)
                .code("GIAM50K")
                .name("Giảm 50K cho đơn từ 300K")
                .description("Voucher giảm giá cố định")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("50000.00"))
                .minOrderValue(new BigDecimal("300000.00"))
                .quantity(100)
                .usedQuantity(10)
                .startDate(LocalDate.now().minusDays(5))
                .endDate(LocalDate.now().plusDays(10))
                .status(VoucherStatus.ACTIVE)
                .build();

        samplePercentVoucher = Voucher.builder()
                .id(2L)
                .code("SALE10")
                .name("Giảm 10% tối đa 100K")
                .description("Voucher giảm giá theo %")
                .discountType(DiscountType.PERCENT)
                .discountValue(new BigDecimal("10.00"))
                .maxDiscount(new BigDecimal("100000.00"))
                .minOrderValue(new BigDecimal("200000.00"))
                .quantity(50)
                .usedQuantity(5)
                .startDate(LocalDate.now().minusDays(2))
                .endDate(LocalDate.now().plusDays(20))
                .status(VoucherStatus.ACTIVE)
                .build();
    }

    // =========================================================================
    // Admin CRUD Tests
    // =========================================================================

    @Test
    @DisplayName("Admin: Lấy toàn bộ danh sách voucher thành công")
    void getAllVouchers_Success() {
        when(voucherRepository.findAll(any(Sort.class))).thenReturn(List.of(sampleFixedVoucher, samplePercentVoucher));

        List<VoucherResponse> result = voucherService.getAllVouchers();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getCode()).isEqualTo("GIAM50K");
        assertThat(result.get(1).getCode()).isEqualTo("SALE10");
        verify(voucherRepository, times(1)).findAll(any(Sort.class));
    }

    @Test
    @DisplayName("Admin: Lấy chi tiết voucher theo ID thành công")
    void getVoucherById_Success() {
        when(voucherRepository.findById(1L)).thenReturn(Optional.of(sampleFixedVoucher));

        VoucherResponse result = voucherService.getVoucherById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getCode()).isEqualTo("GIAM50K");
    }

    @Test
    @DisplayName("Admin: Lấy chi tiết voucher không tồn tại -> Ném ResourceNotFoundException")
    void getVoucherById_NotFound_ShouldThrow() {
        when(voucherRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> voucherService.getVoucherById(999L));
    }

    @Test
    @DisplayName("Admin: Tạo mới voucher thành công")
    void createVoucher_Success() {
        VoucherRequest request = VoucherRequest.builder()
                .code("WELCOME20")
                .name("Chào bạn mới 20%")
                .discountType(DiscountType.PERCENT)
                .discountValue(new BigDecimal("20.00"))
                .maxDiscount(new BigDecimal("50000.00"))
                .minOrderValue(new BigDecimal("100000.00"))
                .quantity(200)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(30))
                .build();

        when(voucherRepository.existsByCodeIgnoreCase("WELCOME20")).thenReturn(false);
        when(voucherRepository.save(any(Voucher.class))).thenAnswer(invocation -> {
            Voucher v = invocation.getArgument(0);
            v.setId(3L);
            return v;
        });

        VoucherResponse response = voucherService.createVoucher(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(3L);
        assertThat(response.getCode()).isEqualTo("WELCOME20");
        assertThat(response.getUsedQuantity()).isEqualTo(0);
        assertThat(response.getStatus()).isEqualTo(VoucherStatus.ACTIVE);
    }

    @Test
    @DisplayName("Admin: Tạo voucher bị trùng mã code -> Ném DuplicateResourceException (409)")
    void createVoucher_DuplicateCode_ShouldThrowDuplicateResourceException() {
        VoucherRequest request = VoucherRequest.builder()
                .code("GIAM50K")
                .name("Trùng code")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("50000"))
                .quantity(10)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(5))
                .build();

        when(voucherRepository.existsByCodeIgnoreCase("GIAM50K")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> voucherService.createVoucher(request));
        verify(voucherRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin: Cập nhật voucher thành công")
    void updateVoucher_Success() {
        VoucherRequest request = VoucherRequest.builder()
                .code("GIAM50K_V2")
                .name("Giảm 50K Cập Nhật")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("50000.00"))
                .minOrderValue(new BigDecimal("400000.00"))
                .quantity(150)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(15))
                .status(VoucherStatus.ACTIVE)
                .build();

        when(voucherRepository.findById(1L)).thenReturn(Optional.of(sampleFixedVoucher));
        when(voucherRepository.existsByCodeIgnoreCaseAndIdNot("GIAM50K_V2", 1L)).thenReturn(false);
        when(voucherRepository.save(any(Voucher.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VoucherResponse updated = voucherService.updateVoucher(1L, request);

        assertThat(updated.getCode()).isEqualTo("GIAM50K_V2");
        assertThat(updated.getName()).isEqualTo("Giảm 50K Cập Nhật");
        assertThat(updated.getQuantity()).isEqualTo(150);
    }

    @Test
    @DisplayName("Admin: Cập nhật số lượng nhỏ hơn số lượt đã dùng (quantity < usedQuantity) -> Ném IllegalStateException")
    void updateVoucher_QuantityLessThanUsedQuantity_ShouldThrow() {
        sampleFixedVoucher.setUsedQuantity(60); // đã dùng 60 lượt

        VoucherRequest request = VoucherRequest.builder()
                .code("GIAM50K")
                .name("Giảm 50K")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("50000.00"))
                .quantity(50) // sửa thành 50 < 60
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(10))
                .build();

        when(voucherRepository.findById(1L)).thenReturn(Optional.of(sampleFixedVoucher));
        when(voucherRepository.existsByCodeIgnoreCaseAndIdNot("GIAM50K", 1L)).thenReturn(false);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> voucherService.updateVoucher(1L, request));

        assertThat(ex.getMessage()).contains("không được nhỏ hơn số lượt đã sử dụng");
        verify(voucherRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin: Đổi trạng thái (toggle) ACTIVE <-> INACTIVE")
    void toggleVoucherStatus_Success() {
        when(voucherRepository.findById(1L)).thenReturn(Optional.of(sampleFixedVoucher));
        when(voucherRepository.save(any(Voucher.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VoucherResponse result = voucherService.toggleVoucherStatus(1L);

        assertThat(result.getStatus()).isEqualTo(VoucherStatus.INACTIVE);

        // Toggle lại lần 2
        when(voucherRepository.findById(1L)).thenReturn(Optional.of(sampleFixedVoucher));
        VoucherResponse result2 = voucherService.toggleVoucherStatus(1L);
        assertThat(result2.getStatus()).isEqualTo(VoucherStatus.ACTIVE);
    }

    @Test
    @DisplayName("Admin: Xóa voucher thành công")
    void deleteVoucher_Success() {
        when(voucherRepository.findById(1L)).thenReturn(Optional.of(sampleFixedVoucher));

        voucherService.deleteVoucher(1L);

        verify(voucherRepository, times(1)).delete(sampleFixedVoucher);
    }

    // =========================================================================
    // Customer Operations: applyVoucher & redeemVoucherForOrder
    // =========================================================================

    @Test
    @DisplayName("Customer: Áp voucher FIXED thành công")
    void applyVoucher_FixedDiscount_Success() {
        when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(sampleFixedVoucher));

        ApplyVoucherRequest request = ApplyVoucherRequest.builder()
                .code("GIAM50K")
                .orderTotal(new BigDecimal("500000.00"))
                .build();

        ApplyVoucherResponse response = voucherService.applyVoucher(request);

        assertThat(response).isNotNull();
        assertThat(response.getDiscountAmount()).isEqualByComparingTo(new BigDecimal("50000.00"));
        assertThat(response.getFinalAmount()).isEqualByComparingTo(new BigDecimal("450000.00"));
    }

    @Test
    @DisplayName("Customer: Áp voucher PERCENT có maxDiscount cap")
    void applyVoucher_PercentDiscountWithMaxCap_Success() {
        when(voucherRepository.findByCodeIgnoreCase("SALE10")).thenReturn(Optional.of(samplePercentVoucher));

        // Đơn 2 triệu, 10% = 200K > maxDiscount 100K -> giảm tối đa 100K
        ApplyVoucherRequest request = ApplyVoucherRequest.builder()
                .code("SALE10")
                .orderTotal(new BigDecimal("2000000.00"))
                .build();

        ApplyVoucherResponse response = voucherService.applyVoucher(request);

        assertThat(response.getDiscountAmount()).isEqualByComparingTo(new BigDecimal("100000.00"));
        assertThat(response.getFinalAmount()).isEqualByComparingTo(new BigDecimal("1900000.00"));
    }

    @Test
    @DisplayName("Customer: Đơn chưa đạt giá trị tối thiểu minOrderValue -> Ném IllegalStateException")
    void applyVoucher_BelowMinOrderValue_ShouldThrow() {
        when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(sampleFixedVoucher));

        ApplyVoucherRequest request = ApplyVoucherRequest.builder()
                .code("GIAM50K")
                .orderTotal(new BigDecimal("200000.00")) // min 300K
                .build();

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> voucherService.applyVoucher(request));

        assertThat(ex.getMessage()).contains("Đơn hàng tối thiểu");
    }

    @Test
    @DisplayName("Customer: Voucher đã hết hạn (expired) -> Ném IllegalStateException")
    void applyVoucher_Expired_ShouldThrow() {
        sampleFixedVoucher.setEndDate(LocalDate.now().minusDays(1));
        when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(sampleFixedVoucher));

        ApplyVoucherRequest request = ApplyVoucherRequest.builder()
                .code("GIAM50K")
                .orderTotal(new BigDecimal("500000.00"))
                .build();

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> voucherService.applyVoucher(request));

        assertThat(ex.getMessage()).contains("đã hết hạn");
    }

    @Test
    @DisplayName("Customer: Voucher đã hết lượt (sold out) -> Ném IllegalStateException")
    void applyVoucher_SoldOut_ShouldThrow() {
        sampleFixedVoucher.setUsedQuantity(sampleFixedVoucher.getQuantity()); // 100/100
        when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(sampleFixedVoucher));

        ApplyVoucherRequest request = ApplyVoucherRequest.builder()
                .code("GIAM50K")
                .orderTotal(new BigDecimal("500000.00"))
                .build();

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> voucherService.applyVoucher(request));

        assertThat(ex.getMessage()).contains("hết lượt sử dụng");
    }

    @Test
    @DisplayName("Checkout: redeemVoucherForOrder thành công và gọi Atomic Update")
    void redeemVoucherForOrder_Success() {
        when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(sampleFixedVoucher));
        when(voucherRepository.incrementUsedQuantityAtomically(eq(1L), any(LocalDate.class))).thenReturn(1);

        BigDecimal discount = voucherService.redeemVoucherForOrder("GIAM50K", new BigDecimal("500000.00"));

        assertThat(discount).isEqualByComparingTo(new BigDecimal("50000.00"));
        verify(voucherRepository, times(1)).incrementUsedQuantityAtomically(eq(1L), any(LocalDate.class));
    }

    @Test
    @DisplayName("Checkout: Race condition khi áp voucher - Atomic Update trả về 0 -> Ném IllegalStateException")
    void redeemVoucherForOrder_AtomicUpdateZero_ShouldThrowIllegalStateException() {
        when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(sampleFixedVoucher));
        when(voucherRepository.incrementUsedQuantityAtomically(eq(1L), any(LocalDate.class))).thenReturn(0);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> voucherService.redeemVoucherForOrder("GIAM50K", new BigDecimal("500000.00")));

        assertThat(ex.getMessage()).contains("vừa hết lượt sử dụng");
    }

    @Test
    @DisplayName("Hoàn lượt Voucher: restoreVoucherUsage gọi decrementUsedQuantityByCode")
    void restoreVoucherUsage_Success() {
        when(voucherRepository.decrementUsedQuantityByCode("GIAM50K")).thenReturn(1);

        voucherService.restoreVoucherUsage("GIAM50K");

        verify(voucherRepository, times(1)).decrementUsedQuantityByCode("GIAM50K");
    }
}

