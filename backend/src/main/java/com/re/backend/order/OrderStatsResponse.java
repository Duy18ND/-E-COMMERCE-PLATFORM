package com.re.backend.order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderStatsResponse {

    private long totalOrders;
    private BigDecimal totalRevenue;
    private long pendingCount;
    private long paidCount;
    private long shippingCount;
    private long completedCount;
    private long cancelledCount;
    private long totalUsers;
}
