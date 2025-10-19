import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useAppStore } from '../hooks/useAppStore';

const emotionColors = {
  Happy: '#FFD700',
  Sad: '#4682B4',
  Angry: '#FF0000',
  Disgust: '#228B22',
  Fear: '#800080',
  Surprise: '#FFA500',
  Neutral: '#A9A9A9',
};

const emotionEmojis = {
  Happy: '😊',
  Sad: '😢',
  Angry: '😠',
  Disgust: '🤢',
  Fear: '😨',
  Surprise: '😲',
  Neutral: '😐',
};

export const EmotionDisplay = () => {
  const { currentEmotion, currentConfidence, processingTime } = useAppStore();
  const [scaleAnim] = useState(new Animated.Value(1));
  const [opacityAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (currentEmotion) {
      // Scale animation
      scaleAnim.setValue(1.2);
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Opacity animation
      opacityAnim.setValue(0.8);
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [currentEmotion]);

  if (!currentEmotion) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>📷 Align your face with camera</Text>
      </View>
    );
  }

  const bgColor = emotionColors[currentEmotion] || '#A9A9A9';
  const emoji = emotionEmojis[currentEmotion] || '🤔';
  const confidencePercent = (currentConfidence * 100).toFixed(1);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bgColor + '20',
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.emotion, { color: bgColor }]}>{currentEmotion}</Text>
      <Text style={styles.confidence}>{confidencePercent}% confident</Text>
      <Text style={styles.timing}>{processingTime?.toFixed(0)}ms</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderRadius: 20,
    marginHorizontal: 20,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emotion: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  confidence: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
  },
  timing: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
});