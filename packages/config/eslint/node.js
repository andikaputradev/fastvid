import globals from "globals";

export default [
  {
    files: ["apps/api/**/*.ts", "packages/{db,security,shared}/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  }
];
