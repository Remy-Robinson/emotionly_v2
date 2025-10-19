import { useState, useEffect } from 'react';
import { Camera } from 'expo-camera';
import * as Permissions from 'expo-permissions';

export const useCameraPermissions = () => {
  const [permission, setPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const requestPermission = async () => {
      try {
        setIsLoading(true);
        
        // Request camera permission
        const { status } = await Camera.requestCameraPermissionsAsync();
        
        if (status === 'granted') {
          setPermission(true);
          console.log('✓ Camera permission granted');
        } else if (status === 'denied') {
          setPermission(false);
          setError('Camera permission denied. Please enable it in settings.');
          console.warn('✗ Camera permission denied');
        } else if (status === 'undetermined') {
          setPermission(null);
          setError('Camera permission not yet determined.');
          console.warn('⚠ Camera permission undetermined');
        }
      } catch (err) {
        console.error('✗ Error requesting camera permission:', err);
        setPermission(false);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    requestPermission();
  }, []);

  const requestPermissionAgain = async () => {
    try {
      setIsLoading(true);
      const { status } = await Camera.requestCameraPermissionsAsync();
      setPermission(status === 'granted');
      
      if (status === 'granted') {
        setError(null);
        console.log('✓ Camera permission re-granted');
      } else {
        setError('Camera permission still denied.');
      }
    } catch (err) {
      console.error('✗ Error requesting permission again:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    permission,
    isLoading,
    hasPermission: permission === true,
    error,
    requestPermissionAgain,
  };
};