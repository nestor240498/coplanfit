// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  // Lógica pura (se ejecuta también en Node con los scripts de comprobación): sin alias ni dependencias de la app
  {
    files: ["src/features/anthropometry/engine/**/*.ts", "src/features/clients/import/core/**/*.ts", "src/lib/escape.ts", "src/lib/phone.ts", "src/theme/colors.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: ["@/*", "react", "react-native*", "expo-*", "@supabase/*"] }],
    },
  },
]);
