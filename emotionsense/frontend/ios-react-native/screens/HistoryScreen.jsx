import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SectionList,
} from 'react-native';
import { useAppStore } from '../hooks/useAppStore';
import * as storage from '../services/storage';

const emotionEmojis = {
  Happy: '😊',
  Sad: '😢',
  Angry: '😠',
  Disgust: '🤢',
  Fear: '😨',
  Surprise: '😲',
  Neutral: '😐',
};

const emotionColors = {
  Happy: '#FFD700',
  Sad: '#4682B4',
  Angry: '#FF0000',
  Disgust: '#228B22',
  Fear: '#800080',
  Surprise: '#FFA500',
  Neutral: '#A9A9A9',
};

export const HistoryScreen = () => {
  const { predictions, stats, loadPredictions, loadStats, clearHistory, userId } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState(24);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await loadPredictions();
      await loadStats();
      console.log('✓ History loaded');
    } catch (error) {
      console.error('✗ Failed to load history:', error);
      Alert.alert('Error', 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all emotion history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearHistory();
              await storage.clearEmotions(userId);
              loadData();
              Alert.alert('Success', 'History cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear history');
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const filePath = await storage.saveEmotionsExportToFile(userId);
      Alert.alert('Success', `Data exported to:\n${filePath}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const renderPredictionItem = ({ item, index }) => {
    const emoji = emotionEmojis[item.emotion] || '🤔';
    const timestamp = new Date(item.timestamp).toLocaleTimeString();
    const confidence = (item.confidence * 100).toFixed(1);
    const bgColor = emotionColors[item.emotion] || '#A9A9A9';

    return (
      <View style={styles.predictionItem}>
        <View style={[styles.emotionBadge, { backgroundColor: bgColor + '30' }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.emotion}>{item.emotion}</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
        <View style={styles.confidenceBox}>
          <Text style={[styles.confidence, { color: bgColor }]}>
            {confidence}%
          </Text>
        </View>
      </View>
    );
  };

  const renderStats = () => {
    if (!stats || stats.total === 0) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>📊 Today's Summary</Text>
          <View style={styles.timeRangeButtons}>
            {[24, 7, 1].map((hours) => (
              <TouchableOpacity
                key={hours}
                style={[
                  styles.timeButton,
                  timeRange === hours && styles.timeButtonActive,
                ]}
                onPress={() => setTimeRange(hours)}
              >
                <Text style={[
                  styles.timeButtonText,
                  timeRange === hours && styles.timeButtonTextActive,
                ]}>
                  {hours}h
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Dominant</Text>
            <Text style={styles.statValue}>
              {stats.dominant_emotion ? emotionEmojis[stats.dominant_emotion] : '—'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Confidence</Text>
            <Text style={styles.statValue}>
              {(stats.average_confidence * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        <View style={styles.emotionBreakdown}>
          <Text style={styles.breakdownTitle}>Emotion Distribution</Text>
          {stats.by_emotion && stats.by_emotion.map(({ emotion, count }) => {
            const percentage = ((count / stats.total) * 100).toFixed(1);
            const color = emotionColors[emotion] || '#A9A9A9';
            return (
              <View key={emotion} style={styles.emotionRow}>
                <Text style={styles.emotionRowLabel}>
                  {emotionEmojis[emotion]} {emotion}
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: color,
                        width: `${percentage}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.emotionRowCount}>
                  {count} ({percentage}%)
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emotion History</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadData}
        >
          <Text style={styles.refreshText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      )}

      {!isLoading && predictions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyText}>No predictions yet</Text>
          <Text style={styles.emptySubtext}>
            Go to Camera and start detecting emotions
          </Text>
        </View>
      ) : (
        <FlatList
          data={predictions}
          renderItem={renderPredictionItem}
          keyExtractor={(item, index) => `${item.timestamp}-${index}`}
          ListHeaderComponent={renderStats}
          ListFooterComponent={
            !isLoading && predictions.length > 0 ? (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={handleExportData}
                >
                  <Text style={styles.exportButtonText}>📤 Export Data</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClearHistory}
                >
                  <Text style={styles.clearButtonText}>🗑️ Clear History</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          scrollEnabled={true}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timeRangeButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  timeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  timeButtonActive: {
    backgroundColor: '#0066cc',
  },
  timeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  timeButtonTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  emotionBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  emotionRowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    width: 80,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  emotionRowCount: {
    fontSize: 12,
    color: '#999',
    width: 60,
    textAlign: 'right',
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0066cc',
  },
  emotionBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 24,
  },
  itemContent: {
    flex: 1,
  },
  emotion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  confidenceBox: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  confidence: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
  },
  actionButtons: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 8,
  },
  exportButton: {
    paddingVertical: 12,
    backgroundColor: '#4caf50',
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    paddingVertical: 12,
    backgroundColor: '#ff3333',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});