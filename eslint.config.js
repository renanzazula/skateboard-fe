// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // dist/* is the web build output; .claude/ holds Claude Code worktrees and
    // scratch state (never source to lint).
    ignores: ["dist/*", ".claude/*", ".expo/*"],
  }
]);
