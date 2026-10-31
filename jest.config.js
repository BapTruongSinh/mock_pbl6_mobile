/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/\\.claude/',
    '/\\.tools/',
    '/\\.cache/',
    '/\\.scaffold/',
    '/artifacts/',
    '/android/',
    '/ios/',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/\\.claude/',
    '<rootDir>/\\.tools/',
    '<rootDir>/\\.cache/',
    '<rootDir>/\\.scaffold/',
    '<rootDir>/artifacts/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/repositories/contracts/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
