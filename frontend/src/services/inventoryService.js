import api from './api';
import { INITIAL_INVENTORY } from './mockData';

let localInventory = [...INITIAL_INVENTORY];

export const inventoryService = {
  getInventory: async (params) => {
    try {
      return await api.get('/inventory', { params });
    } catch (err) {
      // Backend Blocker: Backend chưa triển khai InventoryController
      return [...localInventory];
    }
  },

  updateStock: async (productId, quantity) => {
    try {
      return await api.put(`/inventory/${productId}`, { quantity });
    } catch (err) {
      localInventory = localInventory.map((item) =>
        String(item.id) === String(productId)
          ? { ...item, stock: Number(quantity) }
          : item
      );
      return { productId, quantity };
    }
  }
};

export default inventoryService;
