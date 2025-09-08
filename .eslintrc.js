module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ["airbnb-base"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "no-console": "off",
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-underscore-dangle": "off",
    "consistent-return": "off",
    "no-param-reassign": "off",
    "import/no-extraneous-dependencies": ["error", { devDependencies: true }],
    "max-len": ["error", { code: 120, ignoreComments: true }],
    "object-curly-newline": "off",
    "arrow-parens": ["error", "as-needed"],
    indent: ["error", 2],
    quotes: ["error", "single"],
    semi: ["error", "always"],
  },
};
