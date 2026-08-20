import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.legeros.app',
  appName: 'LEGER_OS',
  webDir: 'public',
  server: {
    // For live production updates and dynamic SSR routes
    url: process.env.CAPACITOR_SERVER_URL || 'https://leger-os.vercel.app',
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#09090b',
      overlaysWebView: false
    },
    SplashScreen: {
      backgroundColor: '#09090b',
      launchShowDuration: 1500,
      launchAutoHide: true,
      androidSplashResourceName: 'splash',
      showSpinner: false
    }
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#09090b',
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  },
  ios: {
    backgroundColor: '#09090b',
    contentInset: 'always'
  }
};

export default config;
