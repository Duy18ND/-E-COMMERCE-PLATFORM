package com.ecommerce.auth.repository;

import com.ecommerce.auth.entity.UserAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserAddressRepository extends JpaRepository<UserAddress, Long> {

    List<UserAddress> findByUserIdOrderByIsDefaultDescCreatedAtDesc(Long userId);

    Optional<UserAddress> findByIdAndUserId(Long id, Long userId);

    /**
     * Bỏ mặc định tất cả địa chỉ của user trước khi set địa chỉ mới làm mặc định.
     * Dùng @Modifying để thực hiện UPDATE không cần load entity vào memory.
     */
    @Modifying
    @Query("UPDATE UserAddress a SET a.isDefault = false WHERE a.userId = :userId AND a.isDefault = true")
    void clearDefaultByUserId(@Param("userId") Long userId);
}
