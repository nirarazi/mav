export default {
  displayName: 'compliance-engine',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/../../tsconfig.base.json',
        diagnostics: false,
        isolatedModules: true,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    // Map all @maverick/nestjs-libraries imports to lightweight stubs
    '^@maverick/nestjs-libraries/(.*)$':
      '<rootDir>/src/__tests__/__stubs__/nestjs-libraries-stub.ts',
    '^@maverick/compliance-engine/(.*)$': '<rootDir>/src/$1',
  },
  // Don't transform node_modules (they're already JS)
  transformIgnorePatterns: ['/node_modules/'],
  // Only match actual test files, not stubs
  testMatch: ['**/__tests__/**/*.test.ts'],
};
