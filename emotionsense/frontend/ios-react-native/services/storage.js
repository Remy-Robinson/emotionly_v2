import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

const db = SQLite.openDatabaseSync('emotionsense.db');

/**
 * Initialize database schema
 */
export const initializeDatabase = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS emotions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        emotion TEXT NOT NULL,
        confidence REAL NOT NULL,
        timestamp TEXT NOT NULL,
        user_id TEXT,
        all_emotions TEXT,
        processing_time_ms REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        frame_rate INTEGER DEFAULT 15,
        dark_mode BOOLEAN DEFAULT 0,
        privacy_mode BOOLEAN DEFAULT 0,
        upload_frequency INTEGER DEFAULT 1000,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_emotions_user_id ON emotions(user_id);
      CREATE INDEX IF NOT EXISTS idx_emotions_timestamp ON emotions(timestamp);
    `);
    console.log('✓ Database initialized successfully');
  } catch (error) {
    console.error('✗ Error initializing database:', error);
    throw error;
  }
};

/**
 * Store emotion prediction locally
 */
export const storeEmotion = async (prediction, userId) => {
  try {
    const { emotion, confidence, timestamp, all_emotions, processing_time_ms } = prediction;
    
    await db.runAsync(
      `INSERT INTO emotions (emotion, confidence, timestamp, user_id, all_emotions, processing_time_ms)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [emotion, confidence, timestamp, userId, JSON.stringify(all_emotions), processing_time_ms]
    );
    console.log(`✓ Emotion stored: ${emotion}`);
  } catch (error) {
    console.error('✗ Error storing emotion:', error);
    throw error;
  }
};

/**
 * Get recent emotions for user
 */
export const getRecentEmotions = async (userId, limit = 100) => {
  try {
    const result = await db.allAsync(
      `SELECT * FROM emotions 
       WHERE user_id = ? 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [userId, limit]
    );
    
    return result.map(row => ({
      ...row,
      all_emotions: JSON.parse(row.all_emotions || '{}'),
    }));
  } catch (error) {
    console.error('✗ Error getting recent emotions:', error);
    throw error;
  }
};

/**
 * Get emotions within time range
 */
export const getEmotionsByDateRange = async (userId, startDate, endDate) => {
  try {
    const result = await db.allAsync(
      `SELECT * FROM emotions 
       WHERE user_id = ? AND timestamp BETWEEN ? AND ?
       ORDER BY timestamp DESC`,
      [userId, startDate.toISOString(), endDate.toISOString()]
    );
    
    return result.map(row => ({
      ...row,
      all_emotions: JSON.parse(row.all_emotions || '{}'),
    }));
  } catch (error) {
    console.error('✗ Error getting emotions by date range:', error);
    throw error;
  }
};

/**
 * Get emotion statistics
 */
export const getEmotionStats = async (userId, hours = 24) => {
  try {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const result = await db.allAsync(
      `SELECT emotion, COUNT(*) as count, AVG(confidence) as avg_confidence
       FROM emotions 
       WHERE user_id = ? AND timestamp > ?
       GROUP BY emotion
       ORDER BY count DESC`,
      [userId, cutoffTime]
    );
    
    const totalCount = result.reduce((sum, row) => sum + row.count, 0);
    
    return {
      total: totalCount,
      by_emotion: result,
      dominant_emotion: result.length > 0 ? result[0].emotion : null,
      average_confidence: result.length > 0 
        ? (result.reduce((sum, row) => sum + row.avg_confidence, 0) / result.length).toFixed(2)
        : 0,
    };
  } catch (error) {
    console.error('✗ Error getting emotion stats:', error);
    throw error;
  }
};

/**
 * Clear all emotions for user
 */
export const clearEmotions = async (userId) => {
  try {
    await db.runAsync(
      `DELETE FROM emotions WHERE user_id = ?`,
      [userId]
    );
    console.log(`✓ Cleared emotions for user: ${userId}`);
  } catch (error) {
    console.error('✗ Error clearing emotions:', error);
    throw error;
  }
};

/**
 * Save user settings
 */
export const saveUserSettings = async (userId, settings) => {
  try {
    const { frame_rate, dark_mode, privacy_mode, upload_frequency } = settings;
    
    await db.runAsync(
      `INSERT OR REPLACE INTO user_settings 
       (user_id, frame_rate, dark_mode, privacy_mode, upload_frequency, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [userId, frame_rate, dark_mode ? 1 : 0, privacy_mode ? 1 : 0, upload_frequency]
    );
    console.log(`✓ Settings saved for user: ${userId}`);
  } catch (error) {
    console.error('✗ Error saving user settings:', error);
    throw error;
  }
};

/**
 * Get user settings
 */
export const getUserSettings = async (userId) => {
  try {
    const result = await db.getFirstAsync(
      `SELECT * FROM user_settings WHERE user_id = ?`,
      [userId]
    );
    
    if (!result) {
      // Return defaults
      return {
        frame_rate: 15,
        dark_mode: false,
        privacy_mode: false,
        upload_frequency: 1000,
      };
    }
    
    return {
      frame_rate: result.frame_rate,
      dark_mode: result.dark_mode === 1,
      privacy_mode: result.privacy_mode === 1,
      upload_frequency: result.upload_frequency,
    };
  } catch (error) {
    console.error('✗ Error getting user settings:', error);
    throw error;
  }
};

/**
 * Export emotions as JSON
 */
export const exportEmotionsAsJSON = async (userId) => {
  try {
    const emotions = await getRecentEmotions(userId, 10000);
    return JSON.stringify(emotions, null, 2);
  } catch (error) {
    console.error('✗ Error exporting emotions:', error);
    throw error;
  }
};

/**
 * Save emotions export to file
 */
export const saveEmotionsExportToFile = async (userId) => {
  try {
    const data = await exportEmotionsAsJSON(userId);
    const fileName = `emotionsense_export_${userId}_${Date.now()}.json`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(filePath, data);
    console.log(`✓ Export saved to: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('✗ Error saving export to file:', error);
    throw error;
  }
};

/**
 * Get total emotion count
 */
export const getTotalEmotionCount = async (userId) => {
  try {
    const result = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM emotions WHERE user_id = ?`,
      [userId]
    );
    return result?.count || 0;
  } catch (error) {
    console.error('✗ Error getting emotion count:', error);
    return 0;
  }
};

/**
 * Delete specific emotion entry
 */
export const deleteEmotion = async (emotionId) => {
  try {
    await db.runAsync(
      `DELETE FROM emotions WHERE id = ?`,
      [emotionId]
    );
    console.log(`✓ Deleted emotion: ${emotionId}`);
  } catch (error) {
    console.error('✗ Error deleting emotion:', error);
    throw error;
  }
};