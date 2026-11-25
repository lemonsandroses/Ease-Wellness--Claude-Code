import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.easewellness.app',
  appName: 'Ease',
  webDir: 'dist',
  // The web view's own background shows during launch and while the page
  // scrolls past its bounds. Left at the default white it flashes against an
  // obsidian app on every cold start.
  backgroundColor: '#06040B',
  ios: {
    backgroundColor: '#06040B',
  },
  android: {
    backgroundColor: '#06040B',
  },
};

export default config;
