const js = require("@eslint/js");
const globals = require("globals");
module.exports = [
  { ignores: ["node_modules/**", "storage/**"] },
  { ...js.configs.recommended, files: ["**/*.js", "**/*.cjs"],
    languageOptions: { ecmaVersion: "latest", sourceType: "commonjs", globals: globals.node },
    rules: { ...js.configs.recommended.rules,
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }] } },
];
