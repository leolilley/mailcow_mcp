module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    // Shareable configs from a plugin need the `plugin:` prefix. Without it
    // ESLint looks for a package named `@typescript-eslint/recommended`, which
    // does not exist, and `npm run lint` fails before linting anything.
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // The codebase already marks intentionally-unused parameters with a
    // leading underscore (`_client`, `_req`, `_next`), which is a convention
    // this option is what enforces. Some of them cannot be removed: Express
    // identifies an error handler by its arity, so the fourth parameter has to
    // be declared whether or not it is called.
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
  },
  env: {
    node: true,
    es2022: true,
  },
}; 