import path from 'path';

export default {
  displayName: 'approval-engine',
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
    '^@maverick/nestjs-libraries/(.*)$':
      '<rootDir>/src/__tests__/__stubs__/nestjs-libraries-stub.ts',
    '^@maverick/approval-engine/(.*)$': '<rootDir>/src/$1',
    '^@prisma/client$': '<rootDir>/../../node_modules/@prisma/client',
  },
  moduleDirectories: ['node_modules', path.resolve(__dirname, '../../node_modules')],
};
