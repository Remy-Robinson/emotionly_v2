import axios from 'axios';
import * as FileSystem from 'expo-file-system';

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '10000');

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
client.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
client.interceptors.response.use(
  (response) => {
    console.log(`[API] Response: ${response.status}`);
    return response;
  },
  (error) => {
    console.error('[API] Response error:', error.message);
    return Promise.reject(error);
  }
);

/**
 * Convert image file to base64
 */
export const imageToBase64 = async (imagePath) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imagePath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

/**
 * Predict emotion from frame
 */
export const predictEmotion = async (frameBase64, userId = null, timestamp = null) => {
  try {
    const response = await client.post('/predict', {
      frame: frameBase64,
      user_id: userId,
      timestamp: timestamp || new Date().toISOString(),
    });
    return response.data;
  } catch (error) {
    console.error('Error predicting emotion:', error.message);
    throw error;
  }
};

/**
 * Batch predict emotions from multiple frames
 */
export const batchPredictEmotion = async (frames) => {
  try {
    const response = await client.post('/predict/batch', frames);
    return response.data;
  } catch (error) {
    console.error('Error in batch prediction:', error.message);
    throw error;
  }
};

/**
 * Check API health
 */
export const checkHealth = async () => {
  try {
    const response = await client.get('/health');
    return response.data;
  } catch (error) {
    console.error('Error checking health:', error.message);
    throw error;
  }
};

/**
 * Check readiness
 */
export const checkReadiness = async () => {
  try {
    const response = await client.get('/health/ready');
    return response.data;
  } catch (error) {
    console.error('Error checking readiness:', error.message);
    throw error;
  }
};

/**
 * Get emotion history for user
 */
export const getEmotionHistory = async (userId, limit = 100, hours = 24) => {
  try {
    const response = await client.get('/history', {
      params: {
        user_id: userId,
        limit,
        hours,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting emotion history:', error.message);
    throw error;
  }
};

/**
 * Get emotion statistics
 */
export const getEmotionStats = async (userId, hours = 24) => {
  try {
    const response = await client.get('/history/stats', {
      params: {
        user_id: userId,
        hours,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting emotion stats:', error.message);
    throw error;
  }
};

/**
 * Clear emotion history
 */
export const clearEmotionHistory = async (userId) => {
  try {
    const response = await client.delete('/history', {
      params: {
        user_id: userId,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error clearing history:', error.message);
    throw error;
  }
};

/**
 * Export user data
 */
export const exportUserData = async (userId) => {
  try {
    const response = await client.get('/history/export', {
      params: {
        user_id: userId,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting data:', error.message);
    throw error;
  }
};

/**
 * Import user data
 */
export const importUserData = async (userId, dataJson) => {
  try {
    const response = await client.post('/history/import', null, {
      params: {
        user_id: userId,
        data_json: dataJson,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error importing data:', error.message);
    throw error;
  }
};

export default client;