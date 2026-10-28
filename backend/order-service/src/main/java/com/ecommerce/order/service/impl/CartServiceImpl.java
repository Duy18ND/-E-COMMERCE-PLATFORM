package com.ecommerce.order.service.impl;

import com.ecommerce.order.client.ProductClient;
import com.ecommerce.order.client.dto.ProductResponse;
import com.ecommerce.order.dto.request.AddToCartRequest;
import com.ecommerce.order.dto.request.UpdateCartItemRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.CartItemResponse;
import com.ecommerce.order.dto.response.CartResponse;
import com.ecommerce.order.entity.Cart;
import com.ecommerce.order.entity.CartItem;
import com.ecommerce.order.exception.AccessDeniedException;
import com.ecommerce.order.exception.NotEnoughStockException;
import com.ecommerce.order.exception.ResourceNotFoundException;
import com.ecommerce.order.repository.CartItemRepository;
import com.ecommerce.order.repository.CartRepository;
import com.ecommerce.order.service.CartService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductClient productClient;

    @Override
    @Transactional(readOnly = true)
    public CartResponse getCart(Long userId) {
        log.info("Fetching cart for userId: {}", userId);
        Optional<Cart> cartOpt = cartRepository.findByUserIdWithItems(userId);
        if (cartOpt.isEmpty()) {
            return CartResponse.builder()
                    .userId(userId)
                    .items(List.of())
                    .totalItems(0)
                    .totalAmount(BigDecimal.ZERO)
                    .build();
        }

        return mapToCartResponse(cartOpt.get());
    }

    @Override
    @Transactional
    public CartResponse addToCart(Long userId, AddToCartRequest request) {
        log.info("Adding product to cart: userId={}, productId={}, quantity={}",
                userId, request.getProductId(), request.getQuantity());

        // 1. Kiểm tra sản phẩm và tồn kho từ Product Service qua Feign
        ProductResponse product = getProductOrThrow(request.getProductId());

        // 2. Tìm hoặc khởi tạo giỏ hàng cho user
        Cart cart = cartRepository.findByUserIdWithItems(userId)
                .orElseGet(() -> cartRepository.findByUserId(userId)
                        .orElseGet(() -> cartRepository.save(Cart.builder().userId(userId).build())));

        // 3. Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
        Optional<CartItem> existingItemOpt = cart.getItems().stream()
                .filter(item -> item.getProductId().equals(request.getProductId()))
                .findFirst();

        int targetQuantity = request.getQuantity();
        if (existingItemOpt.isPresent()) {
            targetQuantity += existingItemOpt.get().getQuantity();
        }

        // 4. Kiểm tra tồn kho đối với tổng số lượng yêu cầu
        if (product.getStockQuantity() == null || product.getStockQuantity() < targetQuantity) {
            int available = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
            throw new NotEnoughStockException("Sản phẩm '" + product.getName() + "' không đủ số lượng tồn kho (Còn lại: "
                    + available + ", yêu cầu trong giỏ: " + targetQuantity + ")");
        }

        // 5. Cập nhật số lượng hoặc thêm mới item
        if (existingItemOpt.isPresent()) {
            existingItemOpt.get().setQuantity(targetQuantity);
            log.info("Updated existing cart item for productId: {}, new quantity: {}", request.getProductId(), targetQuantity);
        } else {
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .productId(request.getProductId())
                    .quantity(request.getQuantity())
                    .build();
            cart.addItem(newItem);
            log.info("Added new item to cart for productId: {}, quantity: {}", request.getProductId(), request.getQuantity());
        }

        Cart savedCart = cartRepository.save(cart);
        return mapToCartResponse(savedCart);
    }

    @Override
    @Transactional
    public CartResponse updateCartItem(Long userId, Long itemId, UpdateCartItemRequest request) {
        log.info("Updating cart item: userId={}, itemId={}, newQuantity={}", userId, itemId, request.getQuantity());

        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm trong giỏ hàng với ID: " + itemId));

        if (!item.getCart().getUserId().equals(userId)) {
            throw new AccessDeniedException("Bạn không có quyền thao tác trên giỏ hàng này");
        }

        ProductResponse product = getProductOrThrow(item.getProductId());
        if (product.getStockQuantity() == null || product.getStockQuantity() < request.getQuantity()) {
            int available = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
            throw new NotEnoughStockException("Sản phẩm '" + product.getName() + "' không đủ số lượng tồn kho (Còn lại: "
                    + available + ", yêu cầu: " + request.getQuantity() + ")");
        }

        item.setQuantity(request.getQuantity());
        cartItemRepository.save(item);

        Cart cart = cartRepository.findByUserIdWithItems(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giỏ hàng của user ID: " + userId));

        return mapToCartResponse(cart);
    }

    @Override
    @Transactional
    public CartResponse removeCartItem(Long userId, Long itemId) {
        log.info("Removing cart item: userId={}, itemId={}", userId, itemId);

        Cart cart = cartRepository.findByUserIdWithItems(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giỏ hàng của user ID: " + userId));

        CartItem itemToRemove = cart.getItems().stream()
                .filter(item -> item.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm ID " + itemId + " trong giỏ hàng"));

        cart.removeItem(itemToRemove);
        Cart savedCart = cartRepository.save(cart);

        return mapToCartResponse(savedCart);
    }

    @Override
    @Transactional
    public void clearCart(Long userId) {
        log.info("Clearing all cart items for userId: {}", userId);
        Optional<Cart> cartOpt = cartRepository.findByUserIdWithItems(userId);
        if (cartOpt.isPresent()) {
            Cart cart = cartOpt.get();
            cart.clearItems();
            cartRepository.save(cart);
        }
    }

    private ProductResponse getProductOrThrow(Long productId) {
        ApiResponse<ProductResponse> productApiResponse = productClient.getProductById(productId);
        if (productApiResponse == null || productApiResponse.getData() == null) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + productId);
        }
        return productApiResponse.getData();
    }

    private CartResponse mapToCartResponse(Cart cart) {
        List<CartItemResponse> itemResponses = new ArrayList<>();
        int totalItems = 0;
        BigDecimal totalAmount = BigDecimal.ZERO;

        if (cart.getItems() != null) {
            for (CartItem item : cart.getItems()) {
                String productName = "Sản phẩm #" + item.getProductId();
                BigDecimal price = BigDecimal.ZERO;
                String imageUrl = null;
                Integer stockAvailable = null;

                try {
                    ApiResponse<ProductResponse> productApiResponse = productClient.getProductById(item.getProductId());
                    if (productApiResponse != null && productApiResponse.getData() != null) {
                        ProductResponse product = productApiResponse.getData();
                        productName = product.getName() != null ? product.getName() : productName;
                        price = product.getPrice() != null ? product.getPrice() : BigDecimal.ZERO;
                        imageUrl = product.getImageUrl();
                        stockAvailable = product.getStockQuantity();
                    }
                } catch (Exception ex) {
                    log.warn("Could not enrich product info for productId {}: {}", item.getProductId(), ex.getMessage());
                }

                BigDecimal subTotal = price.multiply(BigDecimal.valueOf(item.getQuantity()));
                totalItems += item.getQuantity();
                totalAmount = totalAmount.add(subTotal);

                itemResponses.add(CartItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProductId())
                        .productName(productName)
                        .price(price)
                        .quantity(item.getQuantity())
                        .subTotal(subTotal)
                        .imageUrl(imageUrl)
                        .stockAvailable(stockAvailable)
                        .build());
            }
        }

        return CartResponse.builder()
                .id(cart.getId())
                .userId(cart.getUserId())
                .items(itemResponses)
                .totalItems(totalItems)
                .totalAmount(totalAmount)
                .build();
    }
}
