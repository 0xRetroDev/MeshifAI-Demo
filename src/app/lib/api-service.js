import axios from 'axios';

const API_BASE_URL = 'https://tinker.0xretro.dev/ImageTo3D/api';

/**
 * Service for handling API requests to the Image to 3D API
 */
export const ApiService = {
  /**
   * Upload an image file
   * @param {File} file - The image file to upload
   * @returns {Promise<Object>} The response data
   */
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await axios.post(
      `${API_BASE_URL}/upload.php`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  /**
   * Start a 3D model generation
   * @param {Object} data - Generation parameters
   * @returns {Promise<Object>} The response data
   */
  generateModel: async (data) => {
    const response = await axios.post(
      `${API_BASE_URL}/generateModel.php?action=create`,
      data
    );

    return response.data;
  },

  /**
   * Check the status of a model generation
   * @param {string} id - The prediction ID
   * @returns {Promise<Object>} The response data
   */
  checkStatus: async (id) => {
    const response = await axios.get(
      `${API_BASE_URL}/generateModel.php?action=status&id=${id}`
    );

    return response.data;
  },

  /**
   * Download model files
   * @param {string[]} urls - Array of URLs to download
   * @returns {Promise<Object>} The response data
   */
  downloadModelFiles: async (urls) => {
    const response = await axios.post(
      `${API_BASE_URL}/generateModel.php?action=download`,
      { urls }
    );

    return response.data;
  },

  /**
   * Get list of all models
   * @returns {Promise<Object>} The response data
   */
  listModels: async () => {
    const response = await axios.get(
      `${API_BASE_URL}/generateModel.php?action=list`
    );

    return response.data;
  }
};

export default ApiService;