package com.ecommerce.chatbot.tool;

import com.ecommerce.chatbot.client.OrderClient;
import com.ecommerce.chatbot.client.dto.OrderDto;
import com.ecommerce.chatbot.dto.response.ApiResponse;
import com.ecommerce.chatbot.exception.AccessDeniedException;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * AI Tool Calling component for Customer Order Tracking (getMyOrders, getOrderStatus).
 * Security Guarantee: NEVER accepts userId from LLM arguments; strictly uses the verified
 * authenticatedUserId injected by the API Gateway (X-User-Id) to prevent IDOR attacks.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CustomerOrderTools {

    private final OrderClient orderClient;

    public List<OrderDto> getMyOrders(Long authenticatedUserId, String roles) {
        return getCustomerRecentOrders(authenticatedUserId, roles);
    }

    public List<OrderDto> getCustomerRecentOrders(Long authenticatedUserId, String roles) {
        if (authenticatedUserId == null || authenticatedUserId <= 0) {
            throw new AccessDeniedException("Vui lòng đăng nhập tài khoản để tra cứu lịch sử đơn hàng của bạn.");
        }
        try {
            ApiResponse<List<OrderDto>> res = orderClient.getMyOrders(authenticatedUserId, roles);
            if (res != null && res.getData() != null) {
                return res.getData();
            }
            return Collections.emptyList();
        } catch (FeignException.Forbidden | FeignException.Unauthorized ex) {
            throw new AccessDeniedException("Bạn không có quyền truy cập danh sách đơn hàng này.");
        } catch (Exception ex) {
            log.warn("[CustomerOrderTools] getMyOrders failed for userId={}: {}", authenticatedUserId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    public OrderDto getOrderStatus(Long orderId, Long authenticatedUserId, String roles) {
        return trackCustomerOrder(orderId, authenticatedUserId, roles);
    }

    public OrderDto trackCustomerOrder(Long orderId, Long authenticatedUserId, String roles) {
        if (authenticatedUserId == null || authenticatedUserId <= 0) {
            throw new AccessDeniedException("Vui lòng đăng nhập tài khoản để tra cứu chi tiết đơn hàng #" + orderId + ".");
        }
        if (orderId == null || orderId <= 0) {
            return null;
        }
        try {
            ApiResponse<OrderDto> orderRes = orderClient.getOrderById(orderId, authenticatedUserId, roles);
            OrderDto order = orderRes != null ? orderRes.getData() : null;
            if (order != null) {
                // Defense in depth against IDOR at tool boundary (exact role token match)
                boolean isAdmin = roles != null && Arrays.stream(roles.split(","))
                        .map(String::trim)
                        .anyMatch("ROLE_ADMIN"::equals);
                if (!isAdmin && order.getUserId() != null && !authenticatedUserId.equals(order.getUserId())) {
                    throw new AccessDeniedException("Bạn không có quyền tra cứu đơn hàng #" + orderId + " của khách hàng khác.");
                }
                if (order.getStatusHistories() == null || order.getStatusHistories().isEmpty()) {
                    try {
                        ApiResponse<List<OrderDto.OrderStatusHistoryDto>> histRes =
                                orderClient.getOrderStatusHistory(orderId, authenticatedUserId, roles);
                        if (histRes != null && histRes.getData() != null) {
                            order.setStatusHistories(histRes.getData());
                        }
                    } catch (Exception ignored) {
                        // Timeline enrichment is optional
                    }
                }
            }
            return order;
        } catch (FeignException.Forbidden | FeignException.Unauthorized ex) {
            throw new AccessDeniedException("Bạn không có quyền xem đơn hàng #" + orderId + " (chỉ chủ sở hữu đơn hàng mới được phép tra cứu).");
        } catch (FeignException.NotFound ex) {
            return null;
        } catch (AccessDeniedException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("[CustomerOrderTools] trackCustomerOrder(orderId={}, userId={}) failed: {}", orderId, authenticatedUserId, ex.getMessage());
            return null;
        }
    }
}

