/**
 * Unit tests for pure logic plus RNTL render/interaction tests for screens
 * and components. testMatch covers both .ts and .tsx so component tests are
 * picked up; coverage is collected across the whole src/ tree (excluding
 * type declarations and the generated OpenAPI client) so the threshold
 * below reflects real coverage of the app, not just the pure-logic slice.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Metro resolves web CSS imports (see src/shared/constants/theme.ts);
    // Jest never bundles for web, so treat them as no-ops. Must come before
    // the @/* alias below, since these imports go through it too.
    '\\.css$': '<rootDir>/jest.cssMock.js',
    // lucide-react-native's default resolution condition ("react-native")
    // points at its ESM build, which Jest's transform never touches — force
    // its own "require" condition's CJS build instead.
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/.claude/', '<rootDir>/dist/'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/core/api/generated/**',
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
