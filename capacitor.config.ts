import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.investment.portfolio',
  appName: 'ترازینو',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#0B0F17',
    allowMixedContent: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
