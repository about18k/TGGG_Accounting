import api from './api';

const getErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;

  if (typeof responseData?.error === 'string' && responseData.error.trim()) {
    return responseData.error;
  }

  if (typeof responseData?.detail === 'string' && responseData.detail.trim()) {
    return responseData.detail;
  }

  // Handle DRF field-level validation errors (e.g., { "project_name": ["This field is required."] })
  if (typeof responseData === 'object' && responseData !== null) {
    const errorMessages = Object.entries(responseData)
      .map(([field, messages]) => {
        const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
        const messageStr = Array.isArray(messages) ? messages.join(' ') : String(messages);
        return `${fieldName}: ${messageStr}`;
      })
      .join(' | ');
    if (errorMessages.trim()) return errorMessages;
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

  allocateFunds: async (id, payload) => {
    try {
      const response = await api.patch(`/material-requests/${id}/allocate_funds/`, payload);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to allocate funds'),
      };
    }
  },
  
  getComments: async (id) => {
    try {
      const response = await api.get(`/material-requests/${id}/comments/`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to fetch discussion comments'),
      };
    }
  },

  postComment: async (requestId, content, parentId = null) => {
    try {
      const response = await api.post(`/material-requests/${requestId}/comments/`, {
        content,
        parent_id: parentId,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to post comment'),
      };
    }
  },



  // ── Projects ──────────────────────────────────────────────
  getProjects: async () => {
    try {
      const response = await api.get('/material-requests/projects/');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to fetch projects'),
      };
    }
  },

  createProject: async (payload) => {
    try {
      const response = await api.post('/material-requests/projects/', payload);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to create project'),
      };
    }
  },

  updateProject: async (id, payload) => {
    try {
      const response = await api.patch(`/material-requests/projects/${id}/`, payload);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to update project'),
      };
    }
  },

  deleteProject: async (id) => {
    try {
      await api.delete(`/material-requests/projects/${id}/`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to delete project'),
      };
    }
  },

  getProjectApprovedRequests: async (projectId) => {
    try {
      const response = await api.get(`/material-requests/projects/${projectId}/approved-requests/`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to fetch approved requests for project'),
      };
    }
  },

  getRecentApprovedRequests: async () => {
    try {
      const response = await api.get('/material-requests/projects/recent-approved-requests/');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to fetch recent approved requests'),
      };
    }
  },
};

export default materialRequestService;
