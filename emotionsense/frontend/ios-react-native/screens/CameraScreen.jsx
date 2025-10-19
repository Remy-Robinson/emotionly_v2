import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useCameraPermissions } from '../hooks/useCameraPermissions';
import { useAppStore } from '../hooks/useAppStore';
import { EmotionDisplay } from '../components/EmotionDisplay';
import * as api from '../services/api';
import * as storage from '../services/storage';

const { width, height } = Dimensions.get('window');

export const CameraScreen = ({ navigation }) => {
  const { permission, isLoading, hasPermission } = useCameraPermissions();
  const cameraRef = useRef(null);
  const frameIntervalRef = useRef(null);

  const {
    frameRate,
    privacyMode,
    userId,
    setCurrentEmotion,
    addPrediction,
    setError,
    resetError,
  } = useAppStore();

  const [isFacingFront, setIsFacingFront] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [predictions, setPredictions] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Check backend connection on mount
  useEffect(() => {
    checkBackendConnection();
  }, []);

  // Setup frame capture interval
  useEffect(() => {
    if (!hasPermission) return;

    const interval = 1000 / frameRate;
    frameIntervalRef.current = setInterval(async () => {
      if (cameraRef.current && !isProcessing) {
        captureAndPredict();
      }
    }, interval);

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, [frameRate, isProcessing, hasPermission]);

  const checkBackendConnection = async () => {
    try {
      setConnectionStatus('checking');
      await api.checkHealth();
      setConnectionStatus('connected');
      console.log('✓ Backend connected');
    } catch (error) {
      setConnectionStatus('disconnected');
      console.error('✗ Backend connection failed:', error.message);
      Alert.alert(
        'Connection Error',
        'Cannot reach backend server. Make sure it\'s running on http://localhost:8000'
      );
    }
  };

  const captureAndPredict = async () => {
    try {
      setIsProcessing(true);

      if (!cameraRef.current) {
        throw new Error('Camera not initialized');
      }

      // Capture photo as base64
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      });

      if (!photo.base64) {
        throw new Error('Failed to capture frame');
      }

      // Only call backend if not in privacy mode
      if (!privacyMode) {
        // Call backend for prediction
        const result = await api.predictEmotion(
          photo.base64,
          userId
        );

        // Update UI with prediction
        setCurrentEmotion(
          result.emotion,
          result.confidence,
          result.all_emotions,
          result.processing_time_ms
        );

        // Store prediction
        await addPrediction(result);

        // Update counter
        setPredictions(p => p + 1);

        // Haptic feedback for confident predictions
        if (result.confidence > 0.8) {
          try {
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
          } catch (hapticError) {
            console.warn('Haptic feedback not available');
          }
        }
      } else {
        // Privacy mode: just store locally
        const localResult = {
          emotion: 'Processing...',
          confidence: 0,
          timestamp: new Date().toISOString(),
          all_emotions: {},
          processing_time_ms: 0,
        };
        await addPrediction(localResult);
      }

      resetError();
    } catch (error) {
      console.error('✗ Prediction error:', error.message);
      setError(error.message);

      if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        setConnectionStatus('disconnected');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCamera = () => {
    setIsFacingFront(!isFacingFront);
  };

  const handleRetry = () => {
    checkBackendConnection();
    resetError();
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Checking camera permissions...</Text>
      </View>
    );
  }

  // Permission denied state
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>📷 Camera Permission Denied</Text>
        <Text style={styles.errorSubtext}>
          EmotionSense needs camera access to work. Please enable it in settings.
        </Text>
        <TouchableOpacity style={styles.button} onPress={checkBackendConnection}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main camera view
  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        facing={isFacingFront ? 'front' : 'back'}
        ratio="16:9"
      />

      {/* Overlay Content */}
      <View style={styles.overlay}>
        {/* Top Status Bar */}
        <View style={styles.topBar}>
          <View style={[
            styles.statusIndicator,
            {
              backgroundColor:
                connectionStatus === 'connected' ? '#4caf50' :
                connectionStatus === 'checking' ? '#ff9800' :
                '#f44336'
            }
          ]}>
            <Text style={styles.statusText}>
              {connectionStatus === 'connected' ? '● Online' :
               connectionStatus === 'checking' ? '⟳ Checking' :
               '○ Offline'}
            </Text>
          </View>

          <Text style={styles.title}>EmotionSense</Text>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={checkBackendConnection}
          >
            <Text style={styles.refreshText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Emotion Display */}
        <EmotionDisplay />

        {/* Bottom Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={toggleCamera}
          >
            <Text style={styles.iconText}>🔄</Text>
          </TouchableOpacity>

          <View style={styles.statsBox}>
            <Text style={styles.statsText}>
              {predictions} predictions
            </Text>
            {privacyMode && <Text style={styles.privacyBadge}>🔒 Private</Text>}
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.iconText}>📊</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 18,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  iconText: {
    fontSize: 24,
  },
  statsBox: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  statsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  privacyBadge: {
    color: '#90caf9',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#f00',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});