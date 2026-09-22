const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo Router treats every file under src/app (the router root — see
// app.json's expo-router "root") as a route unless it matches +html/+api/
// +middleware or an explicit blockList entry (expo-router's own ignoreList
// covers only the former — see node_modules/expo-router/build/getRoutesCore.js).
// Test files live alongside their screens there (see AGENTS.md/CLAUDE.md), so
// without this they get bundled as literal routes ("(tabs)/index.test") and
// server-rendered during `expo export --platform web`'s static rendering step,
// where `describe`/`it`/`expect` don't exist outside Jest and the build fails
// with "ReferenceError: expect is not defined".
const existingBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : [config.resolver.blockList].filter(Boolean);
config.resolver.blockList = [...existingBlockList, /\.test\.[tj]sx?$/, /\.spec\.[tj]sx?$/];

module.exports = config;
