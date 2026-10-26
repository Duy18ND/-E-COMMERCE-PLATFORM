import { createContext, useState, useEffect, useCallback } from 'react';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import cartService from '../services/cartService';

export const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [cartItems, setCartItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);

  // Chuẩn hóa dữ liệu từ CartResponse của Backend để tương thích giao diện
  const applyCartResponse = useCallback((cartData) => {
    if (!cartData) {
      setCartItems([]);
      setTotalItems(0);
      setTotalPrice(0);
      return;
    }

    const rawItems = cartData.items || [];
    const normalized = rawItems.map((item) => ({
      ...item,
      id: item.itemId, // Định danh cho hành động update/delete
      itemId: item.itemId,
      productId: item.productId,
      name: item.productName || item.name || 'Sản phẩm',
      productName: item.productName || item.name || 'Sản phẩm',
      price: Number(item.unitPrice ?? item.price ?? 0),
      unitPrice: Number(item.unitPrice ?? item.price ?? 0),
      imageUrl: item.imageUrl || '',
      quantity: Number(item.quantity || 0),
      subTotal: Number(item.subTotal ?? (item.quantity * (item.unitPrice || 0)))
    }));

    setCartItems(normalized);
    setTotalItems(normalized.reduce((sum, item) => sum + item.quantity, 0));
    setTotalPrice(
      Number(
        cartData.totalPrice ??
        normalized.reduce((sum, item) => sum + item.subTotal, 0)
      )
    );
  }, []);

  // Lấy giỏ hàng từ Backend khi người dùng đăng nhập thành công
  const fetchCart = useCallback(async () => {
    if (!isAuthenticated || isAdmin) {
      applyCartResponse(null);
      return;
    }

    setLoading(true);
    try {
      const cartData = await cartService.getCart();
      applyCartResponse(cartData);
    } catch (error) {
      console.warn('Không thể tải giỏ hàng từ máy chủ:', error.message);
      applyCartResponse(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin, applyCartResponse]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // 1. Thêm sản phẩm vào giỏ hàng
  const addToCart = useCallback(async (product, quantity = 1) => {
    if (isAdmin) {
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Không thể thêm vào giỏ',
          message: 'Tài khoản Quản trị viên (Admin) không được phép thêm sản phẩm vào giỏ hàng!'
        });
      }
      return false;
    }

    if (!isAuthenticated) {
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Yêu cầu đăng nhập',
          message: 'Vui lòng đăng nhập tài khoản khách hàng để thêm sản phẩm vào giỏ hàng!',
          action: { label: 'Đăng nhập ngay →', to: '/login' }
        });
      }
      return false;
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const productId = product?.id || product?.productId;

    try {
      const updatedCart = await cartService.addItem(productId, qty);
      applyCartResponse(updatedCart);

      if (showToast) {
        showToast({
          type: 'cart',
          title: 'Thêm vào giỏ hàng thành công!',
          product,
          quantity: qty
        });
      }
      return true;
    } catch (err) {
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Thêm vào giỏ thất bại',
          message: err.message || 'Không thể thêm sản phẩm vào giỏ hàng lúc này.'
        });
      }
      return false;
    }
  }, [isAdmin, isAuthenticated, showToast, applyCartResponse]);

  // 2. Cập nhật số lượng
  const updateQuantity = useCallback(async (itemId, quantity) => {
    const qty = Number(quantity);
    try {
      if (qty <= 0) {
        const updatedCart = await cartService.removeItem(itemId);
        applyCartResponse(updatedCart);
      } else {
        const updatedCart = await cartService.updateItem(itemId, qty);
        applyCartResponse(updatedCart);
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật giỏ hàng:', err);
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Lỗi cập nhật',
          message: err.message || 'Không thể cập nhật số lượng sản phẩm.'
        });
      }
    }
  }, [showToast, applyCartResponse]);

  // 3. Xóa sản phẩm khỏi giỏ
  const removeFromCart = useCallback(async (itemId) => {
    try {
      const updatedCart = await cartService.removeItem(itemId);
      applyCartResponse(updatedCart);
    } catch (err) {
      console.error('Lỗi khi xóa sản phẩm khỏi giỏ:', err);
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Lỗi xóa sản phẩm',
          message: err.message || 'Không thể xóa sản phẩm khỏi giỏ.'
        });
      }
    }
  }, [showToast, applyCartResponse]);

  // 4. Xóa toàn bộ giỏ hàng
  const clearCart = useCallback(async () => {
    try {
      const updatedCart = await cartService.clearCart();
      applyCartResponse(updatedCart);
    } catch (err) {
      console.error('Lỗi khi xóa toàn bộ giỏ hàng:', err);
      applyCartResponse(null);
    }
  }, [applyCartResponse]);

  const value = {
    cartItems,
    totalItems,
    totalPrice,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    refreshCart: fetchCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
