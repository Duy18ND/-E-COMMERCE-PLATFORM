package com.ecommerce.product.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ecommerce.product.dto.request.CreateFlashSaleCampaignRequest;
import com.ecommerce.product.dto.request.FlashSaleReserveRequest;
import com.ecommerce.product.dto.response.ApiResponse;
import com.ecommerce.product.dto.response.FlashSaleCampaignResponse;
import com.ecommerce.product.service.FlashSaleService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * REST controller exposing Flash Sale campaign management, active campaign discovery,
 * and atomic Redis Lua stock reservation endpoints.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Flash Sale Controller", description = "Quản lý chiến dịch Flash Sale, tra cứu khuyến mãi hiệu lực và đặt chỗ tồn kho")
public class FlashSaleController {

    private final FlashSaleService flashSaleService;

    @Value("${internal.service-key:ecommerce-internal-service-secret-2026}")
    private String internalServiceKey = "ecommerce-internal-service-secret-2026";

    // -----------------------------------------------------------------------
    // Public APIs
    // -----------------------------------------------------------------------

    @GetMapping("/api/v1/flash-sales/active")
    @Operation(summary = "Lấy danh sách chiến dịch Flash Sale đang hiệu lực [PUBLIC]")
    public ResponseEntity<ApiResponse<List<FlashSaleCampaignResponse>>> getActiveFlashSales() {
        List<FlashSaleCampaignResponse> campaigns = flashSaleService.getActiveCampaigns();
        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách Flash Sale đang diễn ra thành công", campaigns));
    }

    @PostMapping("/api/v1/flash-sales/reserve")
    @Operation(summary = "Đặt chỗ trừ tồn kho Flash Sale nguyên tử qua Redis Lua [INTERNAL/ADMIN]")
    public ResponseEntity<ApiResponse<Void>> reserveFlashSaleStock(
            @RequestHeader(value = "X-Internal-Service-Key", required = false) String internalKey,
            @RequestHeader(value = "X-User-Roles", required = false) String userRoles,
            @Valid @RequestBody FlashSaleReserveRequest request) {

        requireInternalOrAdmin(internalKey, userRoles);
        flashSaleService.reserveFlashSaleStock(request.productId(), request.quantity());

        log.info("[FlashSale] Reserve OK — productId={}, qty={}", request.productId(), request.quantity());

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Đặt chỗ Flash Sale thành công! Sản phẩm "
                                + request.productId() + " x" + request.quantity(),
                        null));
    }

    @PostMapping("/api/v1/flash-sales/restore")
    @Operation(summary = "Hoàn trả tồn kho Flash Sale khi checkout lỗi, hủy đơn hoặc thanh toán thất bại [INTERNAL/ADMIN]")
    public ResponseEntity<ApiResponse<Void>> restoreFlashSaleStock(
            @RequestHeader(value = "X-Internal-Service-Key", required = false) String internalKey,
            @RequestHeader(value = "X-User-Roles", required = false) String userRoles,
            @Valid @RequestBody FlashSaleReserveRequest request) {

        requireInternalOrAdmin(internalKey, userRoles);
        flashSaleService.restoreFlashSaleStock(request.productId(), request.quantity());

        log.info("[FlashSale] Restore OK — productId={}, qty={}", request.productId(), request.quantity());

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Hoàn trả tồn kho Flash Sale thành công cho sản phẩm "
                                + request.productId() + " x" + request.quantity(),
                        null));
    }

    // -----------------------------------------------------------------------
    // Admin Campaign Management APIs
    // -----------------------------------------------------------------------

    @GetMapping("/api/v1/admin/flash-sales/campaigns")
    @Operation(summary = "Lấy toàn bộ danh sách chiến dịch Flash Sale [ADMIN]")
    public ResponseEntity<ApiResponse<List<FlashSaleCampaignResponse>>> getAllCampaigns(
            @RequestHeader(value = "X-User-Roles", required = false) String userRoles) {

        requireAdminRole(userRoles);
        List<FlashSaleCampaignResponse> campaigns = flashSaleService.getAllCampaigns();
        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách chiến dịch Flash Sale thành công", campaigns));
    }

    @GetMapping("/api/v1/admin/flash-sales/campaigns/{id}")
    @Operation(summary = "Xem chi tiết một chiến dịch Flash Sale [ADMIN]")
    public ResponseEntity<ApiResponse<FlashSaleCampaignResponse>> getCampaignById(
            @RequestHeader(value = "X-User-Roles", required = false) String userRoles,
            @PathVariable Long id) {

        requireAdminRole(userRoles);
        FlashSaleCampaignResponse campaign = flashSaleService.getCampaignById(id);
        return ResponseEntity.ok(
                ApiResponse.success("Lấy chi tiết chiến dịch Flash Sale thành công", campaign));
    }

    @PostMapping("/api/v1/admin/flash-sales/campaigns")
    @Operation(summary = "Tạo chiến dịch Flash Sale mới và kiểm soát giá/số lượng [ADMIN]")
    public ResponseEntity<ApiResponse<FlashSaleCampaignResponse>> createCampaign(
            @RequestHeader(value = "X-User-Roles", required = false) String userRoles,
            @Valid @RequestBody CreateFlashSaleCampaignRequest request) {

        requireAdminRole(userRoles);
        FlashSaleCampaignResponse created = flashSaleService.createCampaign(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo chiến dịch Flash Sale thành công", created));
    }

    @PutMapping("/api/v1/admin/flash-sales/campaigns/{id}")
    @Operation(summary = "Cập nhật thông tin và danh sách sản phẩm chiến dịch Flash Sale [ADMIN]")
    public ResponseEntity<ApiResponse<FlashSaleCampaignResponse>> updateCampaign(
            @RequestHeader(value = "X-User-Roles", required = false) String userRoles,
            @PathVariable Long id,
            @Valid @RequestBody CreateFlashSaleCampaignRequest request) {

        requireAdminRole(userRoles);
        FlashSaleCampaignResponse updated = flashSaleService.updateCampaign(id, request);
        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật chiến dịch Flash Sale thành công", updated));
    }

    @PutMapping("/api/v1/admin/flash-sales/campaigns/{id}/status")
    @Operation(summary = "Kích hoạt hoặc kết thúc chiến dịch Flash Sale [ADMIN]")
    public ResponseEntity<ApiResponse<FlashSaleCampaignResponse>> updateCampaignStatus(
            @RequestHeader(value = "X-User-Roles", required = false) String userRoles,
            @PathVariable Long id,
            @RequestParam String status) {

        requireAdminRole(userRoles);
        FlashSaleCampaignResponse updated = flashSaleService.updateCampaignStatus(id, status);
        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật trạng thái chiến dịch Flash Sale thành công", updated));
    }

    @DeleteMapping("/api/v1/admin/flash-sales/campaigns/{id}")
    @Operation(summary = "Xóa chiến dịch Flash Sale [ADMIN]")
    public ResponseEntity<ApiResponse<Void>> deleteCampaign(
            @RequestHeader(value = "X-User-Roles", required = false) String userRoles,
            @PathVariable Long id) {

        requireAdminRole(userRoles);
        flashSaleService.deleteCampaign(id);
        return ResponseEntity.ok(
                ApiResponse.success("Xóa chiến dịch Flash Sale thành công", null));
    }

    @PostMapping("/api/v1/admin/flash-sales/products/{productId}")
    @Operation(summary = "Khởi tạo trực tiếp số lượng Flash Sale cho 1 sản phẩm lên Redis [ADMIN]")
    public ResponseEntity<ApiResponse<Void>> initFlashSale(
            @PathVariable Long productId,
            @RequestParam int stock,
            @RequestHeader(value = "X-User-Roles", required = false) String userRoles) {

        requireAdminRole(userRoles);

        flashSaleService.initFlashSaleStock(productId, stock);

        log.info("[FlashSale] Admin opened flash sale — productId={}, stock={}", productId, stock);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Flash Sale đã được kích hoạt cho sản phẩm " + productId
                                + " với " + stock + " sản phẩm",
                        null));
    }

    private void requireInternalOrAdmin(String internalKey, String roles) {
        com.ecommerce.product.security.InternalAuthValidator.requireInternalOrAdmin(
                internalServiceKey,
                internalKey,
                roles,
                "Truy cập bị từ chối: API nội bộ Flash Sale chỉ cho phép order-service hoặc ROLE_ADMIN");
    }

    private void requireAdminRole(String roles) {
        com.ecommerce.product.security.InternalAuthValidator.requireAdminRole(
                roles, "Truy cập bị từ chối: yêu cầu quyền ROLE_ADMIN");
    }
}
