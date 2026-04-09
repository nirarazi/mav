import path from 'path';

export default {
  displayName: 'engagement-engine',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['__stubs__'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          target: 'es2020',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: false,
          skipLibCheck: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
        diagnostics: false,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@mav/nestjs-libraries/(.*)$':
      '<rootDir>/src/__tests__/__stubs__/nestjs-libraries-stub.ts',
    '^@mav/engagement-engine/(.*)$': '<rootDir>/src/$1',
    '^@prisma/client$': '<rootDir>/../../node_modules/@prisma/client',
  },
  moduleDirectories: ['node_modules', path.resolve(__dirname, '../../node_modules')],
};
