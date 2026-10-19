module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
    '**/tests/**/*.test.ts'
  ],
  transform: {
    '^.+\.ts$': 'ts-jest',
  },
  // The source is written with explicit `.js` extensions on relative imports,
  // which is what the emitted JavaScript needs, but at test time ts-jest is
  // resolving the `.ts` sources, where no such file exists. Mapping a relative
  // `./x.js` back to `./x` is what lets a unit test import a module that has
  // relative imports of its own, such as the transport.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!pretty-bytes)/'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};