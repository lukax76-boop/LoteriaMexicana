import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    html, body { height: 100%; width: 100%; margin: 0; padding: 0; background-color: #1a1a2e; }
    #root { 
      display: flex; height: 100%; flex: 1; 
      max-width: 480px; margin: 0 auto; 
      background-color: white; 
      box-shadow: 0 0 20px rgba(0,0,0,0.5); 
      overflow-x: hidden; overflow-y: auto; 
    }
  `;
  document.head.appendChild(style);
}

export default function App() {
  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
