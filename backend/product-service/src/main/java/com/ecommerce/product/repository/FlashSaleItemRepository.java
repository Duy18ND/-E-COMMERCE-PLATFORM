package com.ecommerce.product.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ecommerce.product.entity.FlashSaleItem;

@Repository
public interface FlashSaleItemRepository extends JpaRepository<FlashSaleItem, Long> {

    @Query("SELECT i FROM FlashSaleItem i JOIN FETCH i.campaign c " +
            "WHERE i.productId = :productId " +
            "AND c.status = 'ACTIVE' " +
            "AND c.startTime <= :now AND c.endTime >= :now " +
            "AND i.soldQuantity < i.quantity " +
            "ORDER BY i.flashSalePrice ASC, c.id DESC")
    List<FlashSaleItem> findActiveItemsByProductId(@Param("productId") Long productId,
                                                   @Param("now") LocalDateTime now);

    default Optional<FlashSaleItem> findActiveByProductId(Long productId, LocalDateTime now) {
        List<FlashSaleItem> items = findActiveItemsByProductId(productId, now);
        return (items == null || items.isEmpty()) ? Optional.empty() : Optional.of(items.get(0));
    }
}

