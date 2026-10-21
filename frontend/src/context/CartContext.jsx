import { createContext, useState, useEffect, useRef } from 'react';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';

export const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { showToast } = useToast();

  const getStorageKey = (u) => {
    if (!u) return null;
    const identifier = u.id || u.username || u.email;
    return identifier ? `cart_user_${identifier}` : null;
  };

  const currentStorageKey = getStorageKey(user);
  const activeKeyRef = useRef(null);

  const [cartItems, setCartItems] = useState([]);

  // Load user cart when authenticated user changes
  useEffect(() => {
    if (!isAuthenticated || !currentStorageKey || isAdmin) {
      activeKeyRef.current = null;
      setCartItems([]);
      return;
    }

    try {
      const saved = localStorage.getItem(currentStorageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      activeKeyRef.current = currentStorageKey;
      setCartItems(parsed);
    } catch (e) {
      console.error('Lỗi khi đọc giỏ hàng từ localStorage:', e);
      activeKeyRef.current = currentStorageKey;
      setCartItems([]);
    }
  }, [isAuthenticated, currentStorageKey, isAdmin]);

  // Persist cart items only for current active user
  useEffect(() => {
    if (
      isAuthenticated &&
      currentStorageKey &&
      !isAdmin &&
      activeKeyRef.current === currentStorageKey
    ) {
      try {
        localStorage.setItem(currentStorageKey, JSON.stringify(cartItems));
      } catch (e) {
        console.error('Lỗi khi lưu giỏ hàng vào localStorage:', e);
      }
    }
  }, [cartItems, isAuthenticated, currentStorageKey, isAdmin]);

  const addToCart = (product, quantity = 1) => {
    // 1. Admin is NOT allowed to add products to cart
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

    // 2. Unauthenticated user must log in
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

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prevItems, { ...product, quantity: qty }];
    });

    if (showToast) {
      showToast({
        type: 'cart',
        title: 'Thêm vào giỏ hàng thành công!',
        product,
        quantity: qty
      });
    }

    return true;
  };



  const removeFromCart = (productId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const value = {
    cartItems,
    totalItems,
    totalPrice,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
