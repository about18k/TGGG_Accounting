import api from './api';

const bimDocumentationService = {
  _extractError: (error, fallbackMessage) => {
    const payload = error?.response?.data;
    return payload?.error || payload?.detail || error?.message || fallbackMessage;
  },

  /**
   * Create new BIM documentation
   * @param {object} data - Documentation data (title, description, doc_type, doc_date, files)
   * @returns {Promise<object>}
   */
  createDocumentation: async (data) => {
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('doc_type', data.doc_type);
      formData.append('doc_date', data.doc_date);

      // Add model files
      if (data.modelFiles && data.modelFiles.length > 0) {
        data.modelFiles.forEach((file) => {
          formData.append('files', file);
          formData.append(`file_type_${file.name}`, 'model');
        });
      }

      // Add image files
      if (data.imageFiles && data.imageFiles.length > 0) {
        data.imageFiles.forEach((file) => {
          formData.append('files', file);
          formData.append(`file_type_${file.name}`, 'image');
        });
      }

      const response = await api.post('/bim-docs/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: bimDocumentationService._extractError(error, 'Failed to create documentation'),
      };
    }
  },

  /**
   * Get all BIM documentations for current user (filtered by role)
   * @param {object} params - Optional query params (e.g. { created_by_role: 'junior_architect' })
   * @returns {Promise<object>}
   */
  getDocumentations: async (params = {}) => {
    try {
      const response = await api.get('/bim-docs/', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: bimDocumentationService._extractError(error, 'Failed to fetch documentations'),
      };
    }
  },

  /**
   * Get a specific BIM documentation by ID
   * @param {number} id - Documentation ID
   * @returns {Promise<object>}
   */
  getDocumentationDetail: async (id) => {
    try {
      const response = await api.get(`/bim-docs/${id}/`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: bimDocumentationService._extractError(error, 'Failed to fetch documentation'),
      };
    }
  },

  /**
   * Update BIM documentation (draft only)
   * @param {number} id - Documentation ID
   * @param {object} data - Updated documentation data
   * @returns {Promise<object>}
   */
  updateDocumentation: async (id, data) => {
    try {
      // If files are included, use FormData
      if (data.imageFiles && data.imageFiles.length > 0) {
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('description', data.description || '');
        formData.append('doc_type', data.doc_type);
        formData.append('doc_date', data.doc_date);

        // Add image files
        data.imageFiles.forEach((file) => {
          formData.append('files', file);
          formData.append(`file_type_${file.name}`, 'image');
        });

        const response = await api.patch(`/bim-docs/${id}/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return { success: true, data: response.data };
      } else {
        // No files, just update text fields
        const response = await api.patch(`/bim-docs/${id}/`, data);
        return { success: true, data: response.data };
      }
    } catch (error) {
      return {
        success: false,
        error: bimDocumentationService._extractError(error, 'Failed to update documentation'),
      };
    }
  },

  /**
   * Delete BIM documentation (draft only)
   * @param {number} id - Documentation ID
   * @returns {Promise<object>}
   */
  deleteDocumentation: async (id) => {
    try {
      await api.delete(`/bim-docs/${id}/`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: bimDocumentationService._extractError(error, 'Failed to delete documentation'),
      };
    }
  },

  /**
   * Submit documentation for review
   * @param {number} id - Documentation ID
   * @returns {Promise<object>}
   */
  submitForReview: async (id) => {
    try {
      const response = await api.post(`/bim-docs/${id}/submit/`, {});
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: bimDocumentationService._extractError(error, 'Failed to submit documentation'),
      };
    }
  },

  /**
   * Approve or reject documentation
   * @param {number} id - Documentation ID
   * @param {string} action - 'approve' or 'reject'
   * @param {string} comments - Optional approval/rejection comments
   * @returns {Promise<object>}
   */
  approvalAction: async (id, action, comments = '') => {
    try {
      const response = await api.post(`/bim-docs/${id}/approval_action/`, {
        action,
        comments,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: bimDocumentationService._extractError(error, 'Failed to process approval'),
      };
    }
  },

  /**
   * Get documentations pending approval
   * @returns {Promise<object>}
   */
  getPendingApprovals: async () => {
    try {
      const response = await api.get('/bim-docs/pending_approval/');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: bimDocumentationService._extractError(error, 'Failed to fetch pending approvals'),
      };
    }
  },

  /**
   * Get user's own documents (for BIM Specialists)
   * @returns {Promise<object>}
   */
  getMyDocuments: async () => {
    try {
      const response = await api.get('/bim-docs/my_documents/');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: bimDocumentationService._extractError(error, 'Failed to fetch your documents'),
      };
    }
  },

  /**
   * Remove a file from documentation
   * @param {number} id - Documentation ID
   * @param {number} fileId - File ID to remove
   * @returns {Promise<object>}
   */
  removeFile: async (id, fileId) => {
    try {
      const response = await api.delete(`/bim-docs/${id}/remove_file/?file_id=${fileId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: bimDocumentationService._extractError(error, 'Failed to remove file'),
      };
    }
  },

  /**
   * Get threaded comments for a documentation
   * @param {number} docId - Documentation ID
   * @returns {Promise<object>}
   */
  getComments: async (docId) => {
    try {
      const response = await api.get(`/bim-docs/${docId}/comments/`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: bimDocumentationService._extractError(error, 'Failed to load comments'),
      };
    }
  },

  /**
   * Post a comment or reply on a documentation
   * @param {number} docId - Documentation ID
   * @param {string} content - Comment text
   * @param {number|null} parentId - Parent comment ID for replies (null for top-level)
   * @returns {Promise<object>}
   */
  postComment: async (docId, content, parentId = null) => {
    try {
      const payload = { content };
      if (parentId) payload.parent_id = parentId;
      const response = await api.post(`/bim-docs/${docId}/comments/`, payload);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: bimDocumentationService._extractError(error, 'Failed to post comment'),
      };
    }
  },
};

export default bimDocumentationService;
