import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Switch,
  Slider,
  Alert,
} from 'react-native';
import { useAppStore } from '../hooks/useAppStore';
import * as storage from '../services/storage';

export const SettingsScreen = () => {
  const {
    frameRate,
    darkMode,
    privacyMode,
    uploadFrequency,
    setFrameRate,
    setDarkMode,
    setPrivacyMode,
    setUploadFrequency,
    clearHistory,
  } = useAppStore();

  const [localFrameRate, setLocalFrameRate] = useState(frameRate);
  const [localDarkMode, setLocalDarkMode] = useState(darkMode);
  const [localPrivacyMode, setLocalPrivacyMode] = useState(privacyMode);
  const [localUploadFrequency, setLocalUploadFrequency] = useState(uploadFrequency);

  useEffect(() => {
    setLocalFrameRate(frameRate);
    setLocalDarkMode(darkMode);
    setLocalPrivacyMode(privacyMode);
    setLocalUploadFrequency(uploadFrequency);
  }, [frameRate, darkMode, privacyMode, uploadFrequency]);

  const handleFrameRateChange = async (value) => {
    const rounded = Math.round(value);
    setLocalFrameRate(rounded);
    await setFrameRate(rounded);
  };

  const handleDarkModeChange = async (value) => {
    setLocalDarkMode(value);
    await setDarkMode(value);
  };

  const handlePrivacyModeChange = async (value) => {
    setLocalPrivacyMode(value);
    await setPrivacyMode(value);
  };

  const handleUploadFrequencyChange = async (value) => {
    const rounded = Math.round(value);
    setLocalUploadFrequency(rounded);
    await setUploadFrequency(rounded);
  };

  const handleExportData = async () => {
    try {
      const userId = useAppStore.getState().userId;
      const filePath = await storage.saveEmotionsExportToFile(userId);
      Alert.alert('Success', `Data exported to:\n${filePath}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all emotions and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            Alert.alert('Success', 'All data cleared');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎥 Camera Settings</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingName}>Frame Rate</Text>
            <Text style={styles.settingValue}>{localFrameRate} FPS</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={30}
            step={1}
            value={localFrameRate}
            onValueChange={handleFrameRateChange}
          />
          <Text style={styles.hint}>Higher = better quality, more battery drain</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 Display Settings</Text>

        <View style={styles.settingItem}>
          <View style={styles.switchRow}>
            <Text style={styles.settingName}>Dark Mode</Text>
            <Switch
              value={localDarkMode}
              onValueChange={handleDarkModeChange}
              trackColor={{ false: '#767577', true: '#81c784' }}
              thumbColor={localDarkMode ? '#4caf50' : '#f4f3f4'}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔒 Privacy Settings</Text>

        <View style={styles.settingItem}>
          <View style={styles.switchRow}>
            <View style={styles.privacyHeader}>
              <Text style={styles.settingName}>Privacy Mode</Text>
              <Text style={styles.privacyBadge}>🔐</Text>
            </View>
            <Switch
              value={localPrivacyMode}
              onValueChange={handlePrivacyModeChange}
              trackColor={{ false: '#767577', true: '#81c784' }}
              thumbColor={localPrivacyMode ? '#4caf50' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.hint}>
            {localPrivacyMode
              ? '✓ Data stored locally only, not sent to server'
              : '→ Data synced with backend for cloud storage'}
          </Text>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingName}>Upload Frequency</Text>
            <Text style={styles.settingValue}>{localUploadFrequency}ms</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={500}
            maximumValue={5000}
            step={100}
            value={localUploadFrequency}
            onValueChange={handleUploadFrequencyChange}
            disabled={localPrivacyMode}
          />
          <Text style={styles.hint}>How often to send data to server</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💾 Data Management</Text>

        <TouchableOpacity style={styles.button} onPress={handleExportData}>
          <Text style={styles.buttonText}>📤 Export Data as JSON</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleClearAllData}
        >
          <Text style={styles.buttonText}>🗑️ Clear All Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ About</Text>
        <Text style={styles.aboutText}>EmotionSense v1.0.0</Text>
        <Text style={styles.aboutText}>Real-time emotion detection</Text>
        <Text style={styles.aboutSubtext}>
          Uses advanced neural networks to analyze facial expressions
        </Text>
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066cc',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyBadge: {
    fontSize: 14,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerButton: {
    backgroundColor: '#ff3333',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  aboutSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  spacer: {
    height: 40,
  },
});