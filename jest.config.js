/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
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
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
