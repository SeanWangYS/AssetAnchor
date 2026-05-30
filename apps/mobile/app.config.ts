import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'AssetAnchor',
  slug: 'assetanchor',
  scheme: 'assetanchor',
  version: '0.0.1',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: { supportsTablet: false, bundleIdentifier: 'com.seanwangys.assetanchor' },
  android: { package: 'com.seanwangys.assetanchor' },
  plugins: [],
};

export default config;
