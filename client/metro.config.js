const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Disable package exports to fix Zustand import.meta issue on web
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
};

module.exports = withNativeWind(config, { input: "./global.css" });
