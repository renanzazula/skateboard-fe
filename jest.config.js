/**
 * Unit tests for pure logic (campaign resolver, frequency/date math, CTA
 * matching, cache freshness). Component/RN-native tests are not wired up —
 * these modules are deliberately kept free of react-native imports so they
 * run under the plain jest-expo transform without native shims.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/.claude/', '<rootDir>/dist/'],
  clearMocks: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
