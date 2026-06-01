/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  const appJson = require('./app.json');

  return {
    ...config,
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      ...config?.extra,
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL,
    },
  };
};
