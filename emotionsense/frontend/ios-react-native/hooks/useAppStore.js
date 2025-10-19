import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import * as storage from '../services/storage';

export const useAppStore = create((set, get) => ({
  // ==================== User State ====================
  userId: uuidv4(),
  userName: 'User',

  // ==================== Prediction State ====================
  currentEmotion: null,
  currentConfidence: 0,
  allEmotions: {},
  processingTime: 0,
  lastPredictionTime: null,

  // ==================== Settings ====================
  frameRate: 15,
  darkMode: false,
  privacyMode: false,
  uploadFrequency: 1000,
  backendUrl: 'http://localhost:8000',

  // ==================== UI State ====================
  isLoading: false,
  error: null,
  cameraActive: false,
  showHistory: false,

  // ==================== History & Stats ====================
  predictions: [],
  stats: null,

  // ==================== ACTIONS ====================

  /**
   * Update current emotion prediction
   */
  setCurrentEmotion: (emotion, confidence, allEmotions, processingTime) =>
    set({
      currentEmotion: emotion,
      currentConfidence: confidence,
      allEmotions: allEmotions || {},
      processingTime: processingTime || 0,
      lastPredictionTime: new Date().toISOString(),
    }),

  /**
   * Update frame rate and save to storage
   */
  setFrameRate: async (frameRate) => {
    set({ frameRate });
    try {
      const userId = get().userId;
      const settings = {
        frame_rate: frameRate,
        dark_mode: get().darkMode,
        privacy_mode: get().privacyMode,
        upload_frequency: get().uploadFrequency,
      };
      await storage.saveUserSettings(userId, settings);
      console.log(`✓ Frame rate set to ${frameRate} FPS`);
    } catch (error) {
      console.error('✗ Error saving frame rate:', error);
    }
  },

  /**
   * Toggle dark mode and save to storage
   */
  setDarkMode: async (darkMode) => {
    set({ darkMode });
    try {
      const userId = get().userId;
      const settings = {
        frame_rate: get().frameRate,
        dark_mode: darkMode,
        privacy_mode: get().privacyMode,
        upload_frequency: get().uploadFrequency,
      };
      await storage.saveUserSettings(userId, settings);
      console.log(`✓ Dark mode ${darkMode ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('✗ Error saving dark mode:', error);
    }
  },

  /**
   * Toggle privacy mode and save to storage
   */
  setPrivacyMode: async (privacyMode) => {
    set({ privacyMode });
    try {
      const userId = get().userId;
      const settings = {
        frame_rate: get().frameRate,
        dark_mode: get().darkMode,
        privacy_mode: privacyMode,
        upload_frequency: get().uploadFrequency,
      };
      await storage.saveUserSettings(userId, settings);
      console.log(`✓ Privacy mode ${privacyMode ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('✗ Error saving privacy mode:', error);
    }
  },

  /**
   * Update upload frequency and save to storage
   */
  setUploadFrequency: async (uploadFrequency) => {
    set({ uploadFrequency });
    try {
      const userId = get().userId;
      const settings = {
        frame_rate: get().frameRate,
        dark_mode: get().darkMode,
        privacy_mode: get().privacyMode,
        upload_frequency: uploadFrequency,
      };
      await storage.saveUserSettings(userId, settings);
      console.log(`✓ Upload frequency set to ${uploadFrequency}ms`);
    } catch (error) {
      console.error('✗ Error saving upload frequency:', error);
    }
  },

  /**
   * Update backend URL
   */
  setBackendUrl: (backendUrl) => {
    set({ backendUrl });
    console.log(`✓ Backend URL set to ${backendUrl}`);
  },

  /**
   * Set loading state
   */
  setLoading: (isLoading) => {
    set({ isLoading });
  },

  /**
   * Set error message
   */
  setError: (error) => {
    set({ error });
    if (error) {
      console.error(`✗ Error: ${error}`);
    }
  },

  /**
   * Reset error message
   */
  resetError: () => {
    set({ error: null });
  },

  /**
   * Set camera active state
   */
  setCameraActive: (cameraActive) => {
    set({ cameraActive });
  },

  /**
   * Toggle history visibility
   */
  setShowHistory: (showHistory) => {
    set({ showHistory });
  },

  /**
   * Add prediction to list and storage
   */
  addPrediction: async (prediction) => {
    try {
      const userId = get().userId;
      const predictions = get().predictions;
      
      // Keep only last 100 in memory
      const newPredictions = [prediction, ...predictions].slice(0, 100);
      set({ predictions: newPredictions });

      // Store locally if not in privacy mode
      if (!get().privacyMode) {
        await storage.storeEmotion(prediction, userId);
        console.log(`✓ Prediction stored: ${prediction.emotion}`);
      } else {
        console.log(`🔒 Privacy mode: Prediction not stored`);
      }
    } catch (error) {
      console.error('✗ Error adding prediction:', error);
      set({ error: error.message });
    }
  },

  /**
   * Load all predictions from local storage
   */
  loadPredictions: async () => {
    try {
      set({ isLoading: true });
      const userId = get().userId;
      const predictions = await storage.getRecentEmotions(userId, 100);
      set({ predictions, error: null });
      console.log(`✓ Loaded ${predictions.length} predictions`);
    } catch (error) {
      console.error('✗ Error loading predictions:', error);
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Calculate and load statistics
   */
  loadStats: async () => {
    try {
      const userId = get().userId;
      const stats = await storage.getEmotionStats(userId, 24);
      set({ stats, error: null });
      console.log(`✓ Statistics loaded: ${stats.total} predictions`);
    } catch (error) {
      console.error('✗ Error loading stats:', error);
      set({ error: error.message });
    }
  },

  /**
   * Load user settings from storage
   */
  loadSettings: async () => {
    try {
      const userId = get().userId;
      const settings = await storage.getUserSettings(userId);
      set({
        frameRate: settings.frame_rate,
        darkMode: settings.dark_mode,
        privacyMode: settings.privacy_mode,
        uploadFrequency: settings.upload_frequency,
      });
      console.log('✓ Settings loaded from storage');
    } catch (error) {
      console.error('✗ Error loading settings:', error);
      set({ error: error.message });
    }
  },

  /**
   * Initialize app (load settings, predictions, stats)
   */
  initializeApp: async () => {
    try {
      set({ isLoading: true });
      const userId = get().userId;
      
      // Initialize database
      await storage.initializeDatabase();
      
      // Load all data
      await Promise.all([
        get().loadSettings(),
        get().loadPredictions(),
        get().loadStats(),
      ]);
      
      set({ error: null });
      console.log('✓ App initialized successfully');
    } catch (error) {
      console.error('✗ Error initializing app:', error);
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Clear all predictions and history
   */
  clearHistory: async () => {
    try {
      const userId = get().userId;
      await storage.clearEmotions(userId);
      set({ 
        predictions: [], 
        stats: null,
        error: null 
      });
      console.log('✓ History cleared');
    } catch (error) {
      console.error('✗ Error clearing history:', error);
      set({ error: error.message });
    }
  },

  /**
   * Export all emotions as JSON
   */
  exportData: async () => {
    try {
      const userId = get().userId;
      const data = await storage.exportEmotionsAsJSON(userId);
      console.log('✓ Data exported');
      return data;
    } catch (error) {
      console.error('✗ Error exporting data:', error);
      set({ error: error.message });
      return null;
    }
  },

  /**
   * Save emotions to file
   */
  saveExportToFile: async () => {
    try {
      const userId = get().userId;
      const filePath = await storage.saveEmotionsExportToFile(userId);
      console.log(`✓ Export saved to: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('✗ Error saving export:', error);
      set({ error: error.message });
      return null;
    }
  },

  /**
   * Get total emotion count
   */
  getTotalCount: async () => {
    try {
      const userId = get().userId;
      const count = await storage.getTotalEmotionCount(userId);
      console.log(`✓ Total emotions: ${count}`);
      return count;
    } catch (error) {
      console.error('✗ Error getting count:', error);
      return 0;
    }
  },

  /**
   * Get dominant emotion
   */
  getDominantEmotion: () => {
    return get().stats?.dominant_emotion || null;
  },

  /**
   * Get average confidence
   */
  getAverageConfidence: () => {
    return get().stats?.average_confidence || 0;
  },

  /**
   * Get emotion statistics
   */
  getEmotionStats: () => {
    return get().stats || null;
  },

  /**
   * Get all predictions
   */
  getPredictions: () => {
    return get().predictions || [];
  },

  /**
   * Reset all state to defaults
   */
  reset: async () => {
    try {
      const userId = get().userId;
      await storage.clearEmotions(userId);
      
      set({
        userId: uuidv4(),
        userName: 'User',
        currentEmotion: null,
        currentConfidence: 0,
        allEmotions: {},
        processingTime: 0,
        lastPredictionTime: null,
        frameRate: 15,
        darkMode: false,
        privacyMode: false,
        uploadFrequency: 1000,
        isLoading: false,
        error: null,
        cameraActive: false,
        showHistory: false,
        predictions: [],
        stats: null,
      });
      
      console.log('✓ App reset to defaults');
    } catch (error) {
      console.error('✗ Error resetting app:', error);
      set({ error: error.message });
    }
  },
}));