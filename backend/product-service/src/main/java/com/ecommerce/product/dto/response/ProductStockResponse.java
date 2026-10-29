package com.ecommerce.product.dto.response;

import java.io.Serializable;

import com.ecommerce.product.entity.Product;
import com.ecommerce.product.enums.ProductStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * [Task ECOM-111 / ECOM-112 / ECOM-221] DTO trả về thông tin kiểm tra tồn kho
 * theo mã sản phẩm.
 * Giúp Guest/Frontend hoặc các service khác kiểm tra nhanh:
 * - Số lượng tồn kho hiện tại (stockQuantity)
 * - Tình trạng còn hàng (inStock)
 * - Có đủ số lượng khách muốn mua hay không (sufficientStock)
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductStockResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    // Mã sản phẩm được kiểm tra
    private Long productId;

    // Tên sản phẩm
    private String productName;

    // Số lượng tồn kho thực tế hiện tại trong DB
    private Integer stockQuantity;

    // Số lượng khách đang yêu cầu kiểm tra (mặc định là 1)
    private Integer requestedQuantity;

    // Trạng thái kinh doanh của sản phẩm (ACTIVE / INACTIVE / OUT_OF_STOCK)
    private ProductStatus status;

    // Cờ báo sản phẩm còn hàng hay đã hết hàng (true nếu ACTIVE và stockQuantity >
    // 0)
    private boolean inStock;

    // Cờ báo có đủ số lượng theo yêu cầu (requestedQuantity) hay không
    private boolean sufficientStock;

    // Thông báo trạng thái tồn kho hiển thị cho người dùng (VD: "Còn hàng", "Hết
    // hàng")
    private String stockStatusMessage;

    /**
     * [Task ECOM-221] Hàm chuyển đổi từ Product Entity sang ProductStockResponse
     * kèm tính toán logic còn hàng / đủ số lượng yêu cầu.
     */
    public static ProductStockResponse fromEntity(Product product, int requestedQty) {
        if (product == null) {
            return null;
        }

        int currentStock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
        boolean isActive = product.getStatus() == ProductStatus.ACTIVE;
        boolean hasStock = isActive && currentStock > 0;
        boolean isSufficient = hasStock && currentStock >= requestedQty;

        String message;
        if (!isActive) {
            message = "Sản phẩm đã ngừng kinh doanh";
        } else if (currentStock <= 0) {
            message = "Hết hàng";
        } else if (!isSufficient) {
            message = "Không đủ số lượng tồn kho (Chỉ còn " + currentStock + " sản phẩm)";
        } else {
            message = "Còn hàng (" + currentStock + " sản phẩm có sẵn)";
        }

        return ProductStockResponse.builder()
                .productId(product.getId())
                .productName(product.getName())
                .stockQuantity(currentStock)
                .requestedQuantity(requestedQty)
                .status(product.getStatus())
                .inStock(hasStock)
                .sufficientStock(isSufficient)
                .stockStatusMessage(message)
                .build();
    }
}