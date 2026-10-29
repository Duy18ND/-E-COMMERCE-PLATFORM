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
  const [totalOriginalPrice, setTotalOriginalPrice] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Chuẩn hóa dữ liệu từ CartResponse của Backend hoặc Local Mock
  const applyCartResponse = useCallback((cartData) => {
    if (!cartData) {
      setCartItems([]);
      setTotalItems(0);
      setTotalPrice(0);
      setTotalOriginalPrice(0);
      setTotalDiscount(0);
      return;
    }

    const rawItems = cartData.items || [];
    const normalized = rawItems.map((item) => {
      const isSale = Boolean(item.isFlashSale || item.salePrice);
      const unitPrice = Number(item.unitPrice ?? item.salePrice ?? item.price ?? 0);
      const originalPrice = Number(item.originalPrice ?? item.price ?? unitPrice);
      const qty = Number(item.quantity || 1);
      const subTotal = Number(item.subTotal ?? (qty * unitPrice));
      const originalSubTotal = Number(item.originalSubTotal ?? (qty * originalPrice));
      const savedAmount = Math.max(0, originalSubTotal - subTotal);

      return {
        ...item,
        id: item.id || item.itemId,
        itemId: item.itemId || item.id,
        productId: item.productId,
        name: item.productName || item.name || 'Sản phẩm',
        productName: item.productName || item.name || 'Sản phẩm',
        resellerTag: item.resellerTag || 'CHÍNH HÃNG UỶ QUYỀN',
        price: unitPrice,
        unitPrice,
        originalPrice,
        salePrice: isSale ? unitPrice : null,
        discountPercent: item.discountPercent || (originalPrice > unitPrice ? Math.round(((originalPrice - unitPrice) / originalPrice) * 100) : 0),
        savedAmount,
        imageUrl: item.imageUrl || '',
        quantity: qty,
        subTotal,
        originalSubTotal,
        isFlashSale: isSale,
        stockNotice: item.stockNotice || (isSale ? 'Chỉ còn số lượng ít giá sốc' : '')
      };
    });

    const sumQty = normalized.reduce((sum, item) => sum + item.quantity, 0);
    const sumTotal = Number(
      cartData.totalPrice ?? normalized.reduce((sum, item) => sum + item.subTotal, 0)
    );
    const sumOriginal = Number(
      cartData.totalOriginalPrice ?? normalized.reduce((sum, item) => sum + item.originalSubTotal, 0)
    );
    const sumDiscount = Math.max(0, sumOriginal - sumTotal);

    setCartItems(normalized);
    setTotalItems(sumQty);
    setTotalPrice(sumTotal);
    setTotalOriginalPrice(sumOriginal);
    setTotalDiscount(sumDiscount);
  }, []);

  // Lấy giỏ hàng từ Backend hoặc Local Mock
  const fetchCart = useCallback(async () => {
    if (isAdmin) {
      applyCartResponse(null);
      return;
    }

    setLoading(true);
    try {
      const cartData = await cartService.getCart();
      applyCartResponse(cartData);
    } catch (error) {
      console.warn('Không thể tải giỏ hàng từ máy chủ, chuyển sang local mock:', error.message);
      try {
        const localData = await cartService.getCart();
        applyCartResponse(localData);
      } catch (e) {
        applyCartResponse(null);
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin, applyCartResponse]);

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

    const qty = Math.max(1, Number(quantity) || 1);
    const productId = product?.id || product?.productId;

    try {
      const updatedCart = await cartService.addItem(productId, qty, product);
      applyCartResponse(updatedCart);

      if (showToast) {
        showToast({
          type: 'cart',
          title: product?.isFlashSale || product?.salePrice ? '⚡ Thêm deal Flash Sale thành công!' : 'Thêm vào giỏ hàng thành công!',
          message: product?.isFlashSale ? 'Sản phẩm Flash Sale đã được bảo lưu giá sốc trong 15 phút!' : '',
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
  }, [isAdmin, showToast, applyCartResponse]);

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
    totalOriginalPrice,
    totalDiscount,
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
