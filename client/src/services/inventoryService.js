import api from './api';

export const inventoryService = {
  getInventory: async (params) => {
    const response = await api.get('/inventory', { params });
    return response.data;
  },

  updateStock: async (productId, quantity) => {
    const response = await api.put(`/inventory/${productId}`, { quantity });
    return response.data;
  }
};

export default inventoryService;
