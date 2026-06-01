module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Monorepo: expo-router lives in the app workspace, so babel-preset-expo's
    // hasModule('expo-router') check fails at the repo root. Force the plugin.
    plugins: [require('babel-preset-expo/build/expo-router-plugin').expoRouterBabelPlugin],
  };
};
