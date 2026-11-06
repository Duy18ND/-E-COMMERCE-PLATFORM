package com.ecommerce.auth.repository;

import com.ecommerce.auth.entity.User;
import com.ecommerce.auth.enums.RoleName;
import com.ecommerce.auth.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * [Task ECOM-145 / ECOM-325] Repository truy vấn người dùng & khách hàng.
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Page<User> findAll(Pageable pageable);

    /**
     * [Task ECOM-145 / ECOM-325] Tìm kiếm và phân trang danh sách khách hàng (ROLE_USER)
     * kèm bộ lọc theo từ khóa (họ tên, email, SĐT) và trạng thái tài khoản (ACTIVE / BLOCKED).
     */
    @Query("SELECT DISTINCT u FROM User u JOIN u.roles r " +
           "WHERE r.name = :roleName " +
           "AND (:status IS NULL OR u.status = :status) " +
           "AND (:keyword IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR u.phone LIKE CONCAT('%', :keyword, '%'))")
    Page<User> searchCustomers(@Param("roleName") RoleName roleName,
                               @Param("keyword") String keyword,
                               @Param("status") UserStatus status,
                               Pageable pageable);

    /**
     * Đếm tổng số lượng người dùng theo vai trò.
     */
    @Query("SELECT COUNT(DISTINCT u) FROM User u JOIN u.roles r WHERE r.name = :roleName")
    long countByRoleName(@Param("roleName") RoleName roleName);
}
