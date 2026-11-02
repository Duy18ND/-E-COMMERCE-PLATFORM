package com.ecommerce.product.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ecommerce.product.entity.FlashSaleCampaign;

@Repository
public interface FlashSaleCampaignRepository extends JpaRepository<FlashSaleCampaign, Long> {

    @Query("SELECT DISTINCT c FROM FlashSaleCampaign c LEFT JOIN FETCH c.items " +
            "WHERE c.status = 'ACTIVE' AND c.startTime <= :now AND c.endTime >= :now " +
            "ORDER BY c.startTime DESC, c.id DESC")
    List<FlashSaleCampaign> findActiveCampaigns(@Param("now") LocalDateTime now);

    @Query("SELECT DISTINCT c FROM FlashSaleCampaign c LEFT JOIN FETCH c.items " +
            "ORDER BY c.createdAt DESC, c.id DESC")
    List<FlashSaleCampaign> findAllWithItems();

    @Query("SELECT c FROM FlashSaleCampaign c LEFT JOIN FETCH c.items WHERE c.id = :id")
    Optional<FlashSaleCampaign> findByIdWithItems(@Param("id") Long id);
}

