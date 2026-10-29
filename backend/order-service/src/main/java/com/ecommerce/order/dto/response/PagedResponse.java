package com.ecommerce.order.dto.response;

import lombok.*;
import org.springframework.data.domain.Page;

import java.io.Serializable;
import java.util.List;

/**
 * Wrapper phân trang chuẩn cho order-service.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PagedResponse<T> implements Serializable {

    private static final long serialVersionUID = 1L;

    private List<T> content;
    private int pageNumber;
    private int pageSize;
    private long totalElements;
    private int totalPages;
    private boolean last;

    public static <T> PagedResponse<T> fromPage(Page<T> page) {
        return PagedResponse.<T>builder()
                .content(page.getContent())
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }
}
