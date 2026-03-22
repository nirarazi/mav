import path from 'path';

export default {
  displayName: 'llm-adapter',
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
        // Let ts-jest find node_modules from root
        baseUrl: path.resolve(__dirname, '../..'),
        paths: {},
      },
      diagnostics: false, // Don't fail on TS errors — we mock these modules
    }],
  },
  moduleDirectories: ['node_modules', path.resolve(__dirname, '../../node_modules')],
  testMatch: ['<rootDir>/src/**/*.test.ts'],
};
