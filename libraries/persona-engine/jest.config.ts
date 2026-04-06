export default {
  displayName: 'persona-engine',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@mav/nestjs-libraries/(.*)$':
      '<rootDir>/../nestjs-libraries/src/$1',
    '^@mav/persona-engine/(.*)$': '<rootDir>/src/$1',
  },
};
