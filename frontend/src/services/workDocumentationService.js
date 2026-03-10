import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const workDocumentationService = {
  /**
   * Upload work documentation for an attendance record
   * @param {number} attendanceId - The attendance record ID
   * @param {File} file - The file to upload (optional)
   * @param {string} note - The work documentation note (required)
   * @returns {Promise<object>} Upload response
   */
  uploadWorkDocumentation: async (attendanceId, file, note) => {
    const formData = new FormData();
    
    if (file) {
      formData.append('file', file);
    }
    if (note) {
      formData.append('work_doc_note', note);
    }
    
    try {
      const response = await axios.post(
        `${API_BASE}/attendance/${attendanceId}/work-docs/upload/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Upload failed',
      };
    }
  },

  /**
   * Get work documentation for an attendance record
   * @param {number} attendanceId - The attendance record ID
   * @returns {Promise<object>} Work documentation data
   */
  getWorkDocumentation: async (attendanceId) => {
    try {
      const response = await axios.get(
        `${API_BASE}/attendance/${attendanceId}/work-docs/`
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Fetch failed',
      };
    }
  },

  /**
   * Get work documentation files from Supabase bucket
   * @param {number} attendanceId - The attendance record ID
   * @returns {Promise<object>} Files list from Supabase
   */
  getWorkDocumentationFiles: async (attendanceId) => {
    try {
      const response = await axios.get(
        `${API_BASE}/attendance/${attendanceId}/work-docs/files/`
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Fetch failed',
      };
    }
  },

  /**
   * Delete a specific work documentation file
   * @param {number} attendanceId - The attendance record ID
   * @param {number} fileIndex - The index of the file to delete
   * @returns {Promise<object>} Delete response
   */
  deleteWorkDocumentationFile: async (attendanceId, fileIndex) => {
    try {
      const response = await axios.delete(
        `${API_BASE}/attendance/${attendanceId}/work-docs/${fileIndex}/delete/`
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Delete failed',
      };
    }
  },
};

export default workDocumentationService;
