// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions roda em Deno e inscricao/ e outro projeto da Vercel
    ignores: ["dist/*", "supabase/functions/*", "inscricao/*"],
  }
]);
