import api from './api';

export const cartService = {
  getCart: async () => {
    return await api.get('/cart');
  },

  addItem: async (productId, quantity = 1) => {
    return await api.post('/cart/items', {
      productId: Number(productId),
      quantity: Number(quantity)
    });
  },

  updateItem: async (itemId, quantity) => {
    return await api.put(`/cart/items/${itemId}`, {
      quantity: Number(quantity)
    });
  },

  removeItem: async (itemId) => {
    return await api.delete(`/cart/items/${itemId}`);
  },

  clearCart: async () => {
    // Backend triển khai ở DELETE /api/cart/clear
    return await api.delete('/cart/clear');
  }
};

export default cartService;
