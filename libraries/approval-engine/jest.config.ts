export default {
  displayName: 'approval-engine',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['__stubs__'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/../../tsconfig.base.json',
        diagnostics: false,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@maverick/nestjs-libraries/(.*)$':
      '<rootDir>/src/__tests__/__stubs__/nestjs-libraries-stub.ts',
    '^@maverick/approval-engine/(.*)$': '<rootDir>/src/$1',
  },
};
