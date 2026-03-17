import api from './api';

const getErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;

  if (typeof responseData?.error === 'string' && responseData.error.trim()) {
    return responseData.error;
  }

  if (typeof responseData?.detail === 'string' && responseData.detail.trim()) {
    return responseData.detail;
  }

  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData;
  }

  return error?.message || fallbackMessage;
};

const materialRequestService = {
  getMaterialRequests: async (params = {}) => {
    try {
      const response = await api.get('/material-requests/', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to fetch material requests'),
      };
    }
  },

  createMaterialRequest: async (payload) => {
    try {
      const response = await api.post('/material-requests/', payload);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to create material request'),
      };
    }
  },

  updateMaterialRequest: async (id, payload) => {
    try {
      const response = await api.patch(`/material-requests/${id}/`, payload);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to update material request'),
      };
    }
  },

  deleteMaterialRequest: async (id) => {
    try {
      await api.delete(`/material-requests/${id}/`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to delete material request'),
      };
    }
  },

  submitMaterialRequest: async (id) => {
    try {
      const response = await api.post(`/material-requests/${id}/submit/`, {});
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to submit material request'),
      };
    }
  },

  approvalAction: async (id, action, comments = '') => {
    try {
      const response = await api.post(`/material-requests/${id}/approval_action/`, {
        action,
        comments,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to process material request decision'),
      };
    }
  },
};

export default materialRequestService;
