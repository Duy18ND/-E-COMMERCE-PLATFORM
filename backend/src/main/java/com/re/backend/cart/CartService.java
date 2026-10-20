package com.re.backend.cart;

import com.re.backend.product.Product;
import com.re.backend.product.ProductRepository;
import com.re.backend.user.User;
import com.re.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    // ─────────────────────────────────────────────
    // GET CART (tạo mới nếu chưa tồn tại)
    // ─────────────────────────────────────────────

    @Transactional
    public CartResponse getCartByEmail(String email) {
        Cart cart = cartRepository.findByUserEmailWithItems(email)
                .orElseGet(() -> createNewCart(email));
        return toCartResponse(cart);
    }

    // ─────────────────────────────────────────────
    // ADD ITEM TO CART
    // ─────────────────────────────────────────────

    @Transactional
    public CartResponse addItem(String email, AddToCartRequest request) {
        // 1. Lấy/tạo giỏ hàng
        Cart cart = cartRepository.findByUserEmail(email)
                .orElseGet(() -> createNewCart(email));

        // 2. Kiểm tra sản phẩm tồn tại
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy sản phẩm với id: " + request.getProductId()));

        // 3. Kiểm tra tồn kho
        validateStock(product, request.getQuantity(), 0);

        // 4. Nếu sản phẩm đã có trong giỏ → cộng dồn, chưa có → thêm mới
        CartItem cartItem = cartItemRepository
                .findByCartIdAndProductId(cart.getId(), product.getId())
                .orElse(null);

        if (cartItem != null) {
            int newQty = cartItem.getQuantity() + request.getQuantity();
            validateStock(product, newQty, 0);
            cartItem.setQuantity(newQty);
            cartItemRepository.save(cartItem);
        } else {
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .product(product)
                    .quantity(request.getQuantity())
                    .build();
            cartItemRepository.save(newItem);
            cart.getItems().add(newItem);
        }

        // 5. Reload với fetch join để trả về đầy đủ
        Cart updatedCart = cartRepository.findByUserEmailWithItems(email).orElseThrow();
        return toCartResponse(updatedCart);
    }

    // ─────────────────────────────────────────────
    // UPDATE ITEM QUANTITY
    // ─────────────────────────────────────────────

    @Transactional
    public CartResponse updateItem(String email, Long itemId, UpdateCartItemRequest request) {
        Cart cart = cartRepository.findByUserEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Giỏ hàng không tồn tại"));

        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy mục giỏ hàng với id: " + itemId));

        // Bảo mật: chỉ cho phép user sở hữu cart được sửa
        if (!item.getCart().getId().equals(cart.getId())) {
            throw new IllegalArgumentException("Bạn không có quyền chỉnh sửa mục này");
        }

        if (request.getQuantity() <= 0) {
            // quantity <= 0 → xóa item
            cart.getItems().remove(item);
            cartItemRepository.delete(item);
        } else {
            validateStock(item.getProduct(), request.getQuantity(), 0);
            item.setQuantity(request.getQuantity());
            cartItemRepository.save(item);
        }

        Cart updatedCart = cartRepository.findByUserEmailWithItems(email).orElseThrow();
        return toCartResponse(updatedCart);
    }

    // ─────────────────────────────────────────────
    // DELETE ONE ITEM
    // ─────────────────────────────────────────────

    @Transactional
    public CartResponse removeItem(String email, Long itemId) {
        Cart cart = cartRepository.findByUserEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Giỏ hàng không tồn tại"));

        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy mục giỏ hàng với id: " + itemId));

        if (!item.getCart().getId().equals(cart.getId())) {
            throw new IllegalArgumentException("Bạn không có quyền xóa mục này");
        }

        cart.getItems().remove(item);
        cartItemRepository.delete(item);

        Cart updatedCart = cartRepository.findByUserEmailWithItems(email).orElseThrow();
        return toCartResponse(updatedCart);
    }

    // ─────────────────────────────────────────────
    // CLEAR ENTIRE CART
    // ─────────────────────────────────────────────

    @Transactional
    public CartResponse clearCart(String email) {
        Cart cart = cartRepository.findByUserEmailWithItems(email)
                .orElseThrow(() -> new IllegalArgumentException("Giỏ hàng không tồn tại"));

        cart.getItems().clear();   // orphanRemoval = true → tự xóa CartItem
        cartRepository.save(cart);

        return toCartResponse(cart);
    }

    // ─────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────

    private Cart createNewCart(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy user với email: " + email));
        Cart newCart = Cart.builder().user(user).build();
        return cartRepository.save(newCart);
    }

    /**
     * Kiểm tra tồn kho. currentInCart: số lượng đã có trong giỏ (dùng khi cộng dồn).
     */
    private void validateStock(Product product, int requestedQty, int currentInCart) {
        if (requestedQty > product.getStockQuantity()) {
            throw new IllegalArgumentException(
                    "Sản phẩm '" + product.getName() + "' chỉ còn " +
                    product.getStockQuantity() + " trong kho");
        }
    }

    /**
     * Chuyển Cart entity → CartResponse DTO (không trả Entity ra ngoài).
     */
    private CartResponse toCartResponse(Cart cart) {
        List<CartItemResponse> itemResponses = cart.getItems().stream()
                .map(item -> {
                    BigDecimal subTotal = item.getProduct().getPrice()
                            .multiply(BigDecimal.valueOf(item.getQuantity()));
                    return CartItemResponse.builder()
                            .itemId(item.getId())
                            .productId(item.getProduct().getId())
                            .productName(item.getProduct().getName())
                            .unitPrice(item.getProduct().getPrice())
                            .imageUrl(item.getProduct().getImageUrl())
                            .quantity(item.getQuantity())
                            .subTotal(subTotal)
                            .build();
                })
                .collect(Collectors.toList());

        BigDecimal totalPrice = itemResponses.stream()
                .map(CartItemResponse::getSubTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CartResponse.builder()
                .cartId(cart.getId())
                .items(itemResponses)
                .totalPrice(totalPrice)
                .build();
    }
}
