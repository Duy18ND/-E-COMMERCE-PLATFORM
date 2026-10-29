package com.ecommerce.order.service;

import com.ecommerce.order.client.ProductClient;
import com.ecommerce.order.client.dto.ProductResponse;
import com.ecommerce.order.dto.request.AddToCartRequest;
import com.ecommerce.order.dto.request.UpdateCartItemRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.CartResponse;
import com.ecommerce.order.entity.Cart;
import com.ecommerce.order.entity.CartItem;
import com.ecommerce.order.exception.AccessDeniedException;
import com.ecommerce.order.exception.NotEnoughStockException;
import com.ecommerce.order.exception.ResourceNotFoundException;
import com.ecommerce.order.repository.CartItemRepository;
import com.ecommerce.order.repository.CartRepository;
import com.ecommerce.order.service.impl.CartServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private ProductClient productClient;

    @InjectMocks
    private CartServiceImpl cartService;

    private ProductResponse sampleProduct;
    private Cart sampleCart;

    @BeforeEach
    void setUp() {
        sampleProduct = ProductResponse.builder()
                .id(101L)
                .name("iPhone 15 Pro")
                .price(new BigDecimal("1000.00"))
                .stockQuantity(10)
                .imageUrl("https://example.com/iphone.png")
                .build();

        sampleCart = Cart.builder()
                .id(1L)
                .userId(10L)
                .items(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("Xem giỏ hàng: Khi user chưa có giỏ -> Trả về giỏ hàng rỗng")
    void getCart_WhenEmpty_ReturnsEmptyCart() {
        when(cartRepository.findByUserIdWithItems(10L)).thenReturn(Optional.empty());

        CartResponse response = cartService.getCart(10L);

        assertThat(response).isNotNull();
        assertThat(response.getUserId()).isEqualTo(10L);
        assertThat(response.getItems()).isEmpty();
        assertThat(response.getTotalItems()).isEqualTo(0);
        assertThat(response.getTotalAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Thêm vào giỏ: Sản phẩm mới, tồn kho đủ -> Thêm thành công")
    void addToCart_Success_NewItem() {
        AddToCartRequest request = AddToCartRequest.builder()
                .productId(101L)
                .quantity(2)
                .build();

        when(productClient.getProductById(101L)).thenReturn(ApiResponse.success(sampleProduct));
        when(cartRepository.findByUserIdWithItems(10L)).thenReturn(Optional.of(sampleCart));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CartResponse response = cartService.addToCart(10L, request);

        assertThat(response).isNotNull();
        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getTotalItems()).isEqualTo(2);
        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("2000.00"));
        verify(cartRepository, times(1)).save(sampleCart);
    }

    @Test
    @DisplayName("Thêm vào giỏ: Đã có sản phẩm trong giỏ -> Cộng dồn số lượng")
    void addToCart_Success_ExistingItem_AccumulateQuantity() {
        CartItem existingItem = CartItem.builder()
                .id(1L)
                .cart(sampleCart)
                .productId(101L)
                .quantity(2)
                .build();
        sampleCart.addItem(existingItem);

        AddToCartRequest request = AddToCartRequest.builder()
                .productId(101L)
                .quantity(3)
                .build();

        when(productClient.getProductById(101L)).thenReturn(ApiResponse.success(sampleProduct));
        when(cartRepository.findByUserIdWithItems(10L)).thenReturn(Optional.of(sampleCart));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CartResponse response = cartService.addToCart(10L, request);

        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getItems().get(0).getQuantity()).isEqualTo(5);
        assertThat(response.getTotalItems()).isEqualTo(5);
        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("5000.00"));
    }

    @Test
    @DisplayName("Thêm vào giỏ thất bại do tồn kho không đủ -> Ném NotEnoughStockException")
    void addToCart_NotEnoughStock_ThrowsNotEnoughStockException() {
        AddToCartRequest request = AddToCartRequest.builder()
                .productId(101L)
                .quantity(15) // Tồn kho chỉ có 10
                .build();

        when(productClient.getProductById(101L)).thenReturn(ApiResponse.success(sampleProduct));
        when(cartRepository.findByUserIdWithItems(10L)).thenReturn(Optional.of(sampleCart));

        NotEnoughStockException ex = assertThrows(
                NotEnoughStockException.class,
                () -> cartService.addToCart(10L, request)
        );

        assertThat(ex.getMessage()).contains("không đủ số lượng tồn kho");
        verify(cartRepository, never()).save(any(Cart.class));
    }

    @Test
    @DisplayName("Thêm vào giỏ thất bại do sản phẩm không tồn tại -> Ném ResourceNotFoundException")
    void addToCart_ProductNotFound_ThrowsResourceNotFoundException() {
        AddToCartRequest request = AddToCartRequest.builder()
                .productId(999L)
                .quantity(1)
                .build();

        when(productClient.getProductById(999L)).thenReturn(ApiResponse.error("Không tìm thấy sản phẩm"));

        assertThrows(
                ResourceNotFoundException.class,
                () -> cartService.addToCart(10L, request)
        );
    }

    @Test
    @DisplayName("Cập nhật số lượng sản phẩm trong giỏ thành công")
    void updateCartItem_Success() {
        CartItem item = CartItem.builder()
                .id(5L)
                .cart(sampleCart)
                .productId(101L)
                .quantity(2)
                .build();
        sampleCart.addItem(item);

        UpdateCartItemRequest request = UpdateCartItemRequest.builder()
                .quantity(4)
                .build();

        when(cartItemRepository.findById(5L)).thenReturn(Optional.of(item));
        when(productClient.getProductById(101L)).thenReturn(ApiResponse.success(sampleProduct));
        when(cartItemRepository.save(any(CartItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(cartRepository.findByUserIdWithItems(10L)).thenReturn(Optional.of(sampleCart));

        CartResponse response = cartService.updateCartItem(10L, 5L, request);

        assertThat(response).isNotNull();
        assertThat(item.getQuantity()).isEqualTo(4);
        verify(cartItemRepository, times(1)).save(item);
    }

    @Test
    @DisplayName("Cập nhật số lượng thất bại do IDOR (User khác cố sửa giỏ) -> Ném AccessDeniedException")
    void updateCartItem_Unauthorized_ThrowsAccessDeniedException() {
        Cart otherCart = Cart.builder().id(2L).userId(99L).build();
        CartItem item = CartItem.builder().id(5L).cart(otherCart).productId(101L).quantity(2).build();

        UpdateCartItemRequest request = UpdateCartItemRequest.builder().quantity(4).build();

        when(cartItemRepository.findById(5L)).thenReturn(Optional.of(item));

        assertThrows(
                AccessDeniedException.class,
                () -> cartService.updateCartItem(10L, 5L, request) // user 10 sửa item của user 99
        );

        verify(cartItemRepository, never()).save(any());
    }

    @Test
    @DisplayName("Xóa sản phẩm khỏi giỏ thành công")
    void removeCartItem_Success() {
        CartItem item = CartItem.builder()
                .id(5L)
                .cart(sampleCart)
                .productId(101L)
                .quantity(2)
                .build();
        sampleCart.addItem(item);

        when(cartRepository.findByUserIdWithItems(10L)).thenReturn(Optional.of(sampleCart));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CartResponse response = cartService.removeCartItem(10L, 5L);

        assertThat(response.getItems()).isEmpty();
        verify(cartRepository, times(1)).save(sampleCart);
    }

    @Test
    @DisplayName("Xóa toàn bộ giỏ hàng thành công")
    void clearCart_Success() {
        CartItem item = CartItem.builder().id(5L).cart(sampleCart).productId(101L).quantity(2).build();
        sampleCart.addItem(item);

        when(cartRepository.findByUserIdWithItems(10L)).thenReturn(Optional.of(sampleCart));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        cartService.clearCart(10L);

        assertThat(sampleCart.getItems()).isEmpty();
        verify(cartRepository, times(1)).save(sampleCart);
    }

    /**
     * [Task ECOM-118 / ECOM-259] Kiểm tra chặn cập nhật số lượng khi vượt quá tồn kho hiện tại.
     */
    @Test
    @DisplayName("Cập nhật số lượng thất bại khi vượt quá tồn kho -> Ném NotEnoughStockException [ECOM-118 / ECOM-259]")
    void updateCartItem_NotEnoughStock_ThrowsNotEnoughStockException() {
        CartItem item = CartItem.builder()
                .id(5L)
                .cart(sampleCart)
                .productId(101L)
                .quantity(2)
                .build();
        sampleCart.addItem(item);

        UpdateCartItemRequest request = UpdateCartItemRequest.builder()
                .quantity(25) // Tồn kho của sampleProduct chỉ có 10
                .build();

        when(cartItemRepository.findById(5L)).thenReturn(Optional.of(item));
        when(productClient.getProductById(101L)).thenReturn(ApiResponse.success(sampleProduct));

        NotEnoughStockException ex = assertThrows(
                NotEnoughStockException.class,
                () -> cartService.updateCartItem(10L, 5L, request)
        );

        assertThat(ex.getMessage()).contains("không đủ số lượng tồn kho");
        verify(cartItemRepository, never()).save(any());
    }

    /**
     * [Task ECOM-118 / ECOM-259] Kiểm tra chặn thêm vào giỏ khi sản phẩm đã ngừng kinh doanh (status = INACTIVE).
     */
    @Test
    @DisplayName("Thêm vào giỏ thất bại khi sản phẩm ngừng kinh doanh (INACTIVE) -> Ném NotEnoughStockException [ECOM-118]")
    void addToCart_InactiveProduct_ThrowsNotEnoughStockException() {
        ProductResponse inactiveProduct = ProductResponse.builder()
                .id(102L)
                .name("iPhone 13 Pro")
                .price(new BigDecimal("800.00"))
                .stockQuantity(10)
                .status("INACTIVE")
                .build();

        AddToCartRequest request = AddToCartRequest.builder()
                .productId(102L)
                .quantity(1)
                .build();

        when(productClient.getProductById(102L)).thenReturn(ApiResponse.success(inactiveProduct));
        when(cartRepository.findByUserIdWithItems(10L)).thenReturn(Optional.of(sampleCart));

        NotEnoughStockException ex = assertThrows(
                NotEnoughStockException.class,
                () -> cartService.addToCart(10L, request)
        );

        assertThat(ex.getMessage()).contains("không còn kinh doanh");
        verify(cartRepository, never()).save(any(Cart.class));
    }

    /**
     * [Task ECOM-259] Kiểm tra tính tổng tiền phía Server (subTotal, totalItems, totalAmount, totalPrice)
     * với nhiều mặt hàng khác nhau trong giỏ hàng.
     */
    @Test
    @DisplayName("Xem giỏ hàng: Tính đúng tạm tính (subTotal) và tổng tiền (totalAmount) phía Server cho nhiều sản phẩm [ECOM-259]")
    void getCart_MultipleItems_CalculatesTotalAmountCorrectlyOnServer() {
        ProductResponse secondProduct = ProductResponse.builder()
                .id(102L)
                .name("AirPods Pro 2")
                .price(new BigDecimal("250.00"))
                .stockQuantity(20)
                .status("ACTIVE")
                .build();

        CartItem item1 = CartItem.builder().id(1L).cart(sampleCart).productId(101L).quantity(2).build(); // 2 * 1000 = 2000
        CartItem item2 = CartItem.builder().id(2L).cart(sampleCart).productId(102L).quantity(3).build(); // 3 * 250 = 750
        sampleCart.addItem(item1);
        sampleCart.addItem(item2);

        when(cartRepository.findByUserIdWithItems(10L)).thenReturn(Optional.of(sampleCart));
        when(productClient.getProductById(101L)).thenReturn(ApiResponse.success(sampleProduct));
        when(productClient.getProductById(102L)).thenReturn(ApiResponse.success(secondProduct));

        CartResponse response = cartService.getCart(10L);

        assertThat(response.getItems()).hasSize(2);
        assertThat(response.getTotalItems()).isEqualTo(5); // 2 + 3
        assertThat(response.getItems().get(0).getSubTotal()).isEqualByComparingTo(new BigDecimal("2000.00"));
        assertThat(response.getItems().get(1).getSubTotal()).isEqualByComparingTo(new BigDecimal("750.00"));
        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("2750.00"));
        assertThat(response.getTotalPrice()).isEqualByComparingTo(new BigDecimal("2750.00"));
    }
}
