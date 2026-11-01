package com.ecommerce.order.dto.response;

import com.ecommerce.order.enums.OrderStatus;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * [Task ECOM-315 / ECOM-171] DTO phản hồi dòng thời gian lịch sử trạng thái đơn hàng.
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderStatusHistoryResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Long orderId;
    private OrderStatus status;
    private String statusDescription;
    private OrderStatus previousStatus;
    private String action;
    private String updatedBy;
    private String actorRole;
    private String note;
    private LocalDateTime createdAt;

    /**
     * Chuyển đổi mã OrderStatus sang nhãn hiển thị tiếng Việt thân thiện với người dùng.
     */
    public static String getStatusDescription(OrderStatus status) {
        if (status == null) {
            return "Không xác định";
        }
        return switch (status) {
            case PENDING -> "Đơn hàng đã được đặt thành công, đang chờ xác nhận";
            case PAID -> "Đã thanh toán thành công qua cổng thanh toán";
            case CONFIRMED -> "Đơn hàng đã được xác nhận bởi người bán / quản trị viên";
            case PROCESSING -> "Đơn hàng đang được chuẩn bị và đóng gói";
            case SHIPPING -> "Đơn hàng đang trên đường vận chuyển tới địa chỉ nhận hàng";
            case DELIVERED -> "Đơn hàng đã giao thành công";
            case CANCELLED -> "Đơn hàng đã bị hủy";
            case FAILED -> "Đơn hàng xử lý thất bại";
            case REFUNDED -> "Đơn hàng đã được hoàn tiền";
        };
    }
}

