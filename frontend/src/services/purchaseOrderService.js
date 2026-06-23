import api from './api';

const purchaseOrderService = {
  getPurchaseOrders: async () => {
    try {
      const response = await api.get('/material-requests/purchase-orders/');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data || error.message || 'Failed to fetch Purchase Orders'
      };
    }
  },

  createPurchaseOrder: async (payload) => {
    try {
      const response = await api.post('/material-requests/purchase-orders/', payload);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data || error.message || 'Failed to create Purchase Order'
      };
    }
  },

  updatePurchaseOrder: async (id, payload) => {
    try {
      const response = await api.put(`/material-requests/purchase-orders/${id}/`, payload);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data || error.message || 'Failed to update Purchase Order'
      };
    }
  },

  deletePurchaseOrder: async (id) => {
    try {
      await api.delete(`/material-requests/purchase-orders/${id}/`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data || error.message || 'Failed to delete Purchase Order'
      };
    }
  },

  submitPurchaseOrder: async (id) => {
    try {
      const response = await api.post(`/material-requests/purchase-orders/${id}/submit/`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data || error.message || 'Failed to submit Purchase Order'
      };
    }
  },

  approvePurchaseOrder: async (id) => {
    try {
      const response = await api.post(`/material-requests/purchase-orders/${id}/approve/`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data || error.message || 'Failed to approve Purchase Order'
      };
    }
  },

  rejectPurchaseOrder: async (id, reason) => {
    try {
      const response = await api.post(`/material-requests/purchase-orders/${id}/reject/`, { reason });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data || error.message || 'Failed to reject Purchase Order'
      };
    }
  },

  tallyPurchaseOrder: async (id, payload) => {
    try {
      // payload must be FormData if sending receipt image file
      const headers = payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
      const response = await api.post(`/material-requests/purchase-orders/${id}/tally_disbursement/`, payload, { headers });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data || error.message || 'Failed to tally Purchase Order'
      };
    }
  }
};

export default purchaseOrderService;
