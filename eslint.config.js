import base from "./packages/config/eslint/base.js";
import node from "./packages/config/eslint/node.js";
import react from "./packages/config/eslint/react.js";
import globals from "globals";

export default [
  ...base,
  ...node,
  ...react,
  {
    files: ["apps/web/scripts/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ["scripts/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        Headers: "readonly",
        fetch: "readonly"
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: ["scripts/*.ts"]
        },
        tsconfigRootDir: process.cwd()
      }
    }
  },
  {
    ignores: ["**/dist/**", "**/node_modules/**", ".turbo/**"]
  }
];
