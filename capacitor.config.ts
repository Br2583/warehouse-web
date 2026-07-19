import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pixelcore.warehousemanager',
  appName: 'Warehouse Manager',
  webDir: 'out',
  server: {
    // Loads the live production site — no static export needed
    url: 'https://managerwarehouse.cc',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0f0f0f',
  },
};

export default config;
