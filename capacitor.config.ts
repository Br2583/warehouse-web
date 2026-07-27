import { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

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
    backgroundColor: '#ffffff',
  },
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
