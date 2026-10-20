package com.re.backend.cart;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartRepository extends JpaRepository<Cart, Long> {

    /**
     * Tìm giỏ hàng theo email của user, đồng thời fetch sẵn items và product
     * để tránh N+1 query khi render CartResponse.
     */
    @Query("SELECT c FROM Cart c " +
           "LEFT JOIN FETCH c.items i " +
           "LEFT JOIN FETCH i.product " +
           "WHERE c.user.email = :email")
    Optional<Cart> findByUserEmailWithItems(@Param("email") String email);

    Optional<Cart> findByUserEmail(String email);
}
