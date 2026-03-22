import path from 'path';

export default {
  displayName: 'agent-brain',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        target: 'es2020',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false,
        skipLibCheck: true,
        resolveJsonModule: true,
      },
      diagnostics: false,
    }],
  },
  moduleDirectories: ['node_modules', path.resolve(__dirname, '../../node_modules')],
  testMatch: ['<rootDir>/src/**/*.test.ts'],
};
