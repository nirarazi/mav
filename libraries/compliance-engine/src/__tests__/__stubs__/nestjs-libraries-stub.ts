// Lightweight stub for @maverick/nestjs-libraries/* imports
// This prevents ts-jest from compiling the entire nestjs-libraries tree.
// Real mocking is done via jest.mock() in test files.

export class PrismaService {
  complianceRule = { findUnique: async () => null };
}

export const ioRedis = {
  get: async () => null,
  set: async () => null,
  expire: async () => null,
};
