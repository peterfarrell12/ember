import type { CapacitorConfig } from '@capacitor/cli';

// The phone apps are the web build (dist) inside a native shell. `npm run native:sync` rebuilds and copies it in.
const config: CapacitorConfig = {
  appId: 'ie.ember.app', // permanent once the app is published in a store
  appName: 'Ember',
  webDir: 'dist',
  backgroundColor: '#0f3d2e',
  plugins: {
    Keyboard: { resize: 'body' }, // the page shrinks above the keyboard, so sheets and their buttons stay in view
  },
};

export default config;
