import api from './api';
import {
  buildRequestCacheKey,
  invalidateRequestCache,
  withRequestCache,
} from './requestCache';

const MATERIAL_REQUEST_CACHE_PREFIX = {
  requests: 'material-requests:list',
  comments: 'material-requests:comments',
  projects: 'material-requests:projects',
  projectApproved: 'material-requests:project-approved',
  recentApproved: 'material-requests:recent-approved',
};

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
      const data = await withRequestCache({
        key: buildRequestCacheKey(MATERIAL_REQUEST_CACHE_PREFIX.requests, params),
        ttlMs: 15000,
        request: async () => {
          const response = await api.get('/material-requests/', { params });
          return response.data;
        },
      });
      return { success: true, data };
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
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.requests);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.recentApproved);
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
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.requests);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.recentApproved);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.projectApproved);
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
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.requests);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.recentApproved);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.projectApproved);
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
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.requests);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.recentApproved);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.projectApproved);
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
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.requests);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.recentApproved);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.projectApproved);
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
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.requests);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.recentApproved);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.projectApproved);
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
      const data = await withRequestCache({
        key: `${MATERIAL_REQUEST_CACHE_PREFIX.comments}:${id}`,
        ttlMs: 10000,
        request: async () => {
          const response = await api.get(`/material-requests/${id}/comments/`);
          return response.data;
        },
      });
      return { success: true, data };
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
      invalidateRequestCache(`${MATERIAL_REQUEST_CACHE_PREFIX.comments}:${requestId}`, { exact: true });
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.requests);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to post comment'),
      };
    }
  },

  editComment: async (requestId, commentId, content) => {
    try {
      const response = await api.patch(`/material-requests/${requestId}/comments/${commentId}/`, { content });
      invalidateRequestCache(`${MATERIAL_REQUEST_CACHE_PREFIX.comments}:${requestId}`, { exact: true });
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.requests);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to edit comment'),
      };
    }
  },

  deleteComment: async (requestId, commentId) => {
    try {
      const response = await api.delete(`/material-requests/${requestId}/comments/${commentId}/`);
      invalidateRequestCache(`${MATERIAL_REQUEST_CACHE_PREFIX.comments}:${requestId}`, { exact: true });
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.requests);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to delete comment'),
      };
    }
  },



  // ── Projects ──────────────────────────────────────────────
  getProjects: async () => {
    try {
      const data = await withRequestCache({
        key: MATERIAL_REQUEST_CACHE_PREFIX.projects,
        ttlMs: 60000,
        request: async () => {
          const response = await api.get('/material-requests/projects/');
          return response.data;
        },
      });
      return { success: true, data };
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
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.projects);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.projectApproved);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.recentApproved);
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
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.projects);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.projectApproved);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.recentApproved);
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
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.projects);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.projectApproved);
      invalidateRequestCache(MATERIAL_REQUEST_CACHE_PREFIX.recentApproved);
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
      const data = await withRequestCache({
        key: `${MATERIAL_REQUEST_CACHE_PREFIX.projectApproved}:${projectId}`,
        ttlMs: 20000,
        request: async () => {
          const response = await api.get(`/material-requests/projects/${projectId}/approved-requests/`);
          return response.data;
        },
      });
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to fetch approved requests for project'),
      };
    }
  },

  getRecentApprovedRequests: async () => {
    try {
      const data = await withRequestCache({
        key: MATERIAL_REQUEST_CACHE_PREFIX.recentApproved,
        ttlMs: 20000,
        request: async () => {
          const response = await api.get('/material-requests/projects/recent-approved-requests/');
          return response.data;
        },
      });
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to fetch recent approved requests'),
      };
    }
  },
};

export default materialRequestService;
