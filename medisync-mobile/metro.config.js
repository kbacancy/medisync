const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// @daily-co/react-native-webrtc ships with a "react-native" field pointing at
// raw TypeScript source (src/index.ts). Metro picks that field over "main" and
// then fails because it won't transpile TS in node_modules. Override the
// resolver so Metro always lands on the pre-built CommonJS output instead.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@daily-co/react-native-webrtc') {
    return {
      filePath: path.resolve(
        __dirname,
        'node_modules/@daily-co/react-native-webrtc/lib/commonjs/index.js'
      ),
      type: 'sourceFile',
    };
  }
  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
