package com.re.backend.cart;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    /**
     * Tìm CartItem theo cart_id và product_id để kiểm tra sản phẩm
     * đã tồn tại trong giỏ trước khi thêm mới hay cộng dồn.
     */
    Optional<CartItem> findByCartIdAndProductId(Long cartId, Long productId);
}
