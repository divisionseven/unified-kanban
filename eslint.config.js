import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tsconfig from "./tsconfig.json" with { type: "json" };

export default [
  {
    ignores: ["dist/", "node_modules/", "webview-ui/node_modules/", ".venv/"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // Bug-catching rules only (no style — Prettier handles that)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Critical Async Rules
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      // Prevent Shipped Debug Code
      "no-console": "error",
      "no-debugger": "error",
      // Catch Incomplete/Broken Code
      "no-unused-expressions": "error",
      "no-constant-binary-expression": "error",
      "no-empty-function": ["error", { allow: ["functions"] }],
      "no-undef": "off", // TypeScript handles this
      "no-unreachable": "error",
      "no-constant-condition": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-fallthrough": "error",
      "no-irregular-whitespace": "error",
      "no-prototype-builtins": "off",
    },
  },
  {
    files: ["webview-ui/src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./webview-ui/tsconfig.json",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Critical Async Rules
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      // Prevent Shipped Debug Code
      "no-console": "error",
      "no-debugger": "error",
      // Catch Incomplete/Broken Code
      "no-unused-expressions": "error",
      "no-constant-binary-expression": "error",
      "no-empty-function": "off", // Test files often have empty stubs
      // React-specific rules
      "react/react-in-jsx-scope": "off", // React 18 doesn't need import React
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "react/no-string-refs": "error",
      "react/no-is-mounted": "error",
      "react/display-name": "error",
      "no-unreachable": "error",
      "no-constant-condition": "error",
    },
  },
];
