// Lightweight stub for @maverick/nestjs-libraries/* imports.
// Prevents ts-jest from compiling the entire nestjs-libraries tree.
// Real mocking is done via jest.mock() in test files.

export class PrismaService {
  approvalPolicy = { findMany: async (): Promise<unknown[]> => [] };
  approvalItem = {
    create: async (): Promise<unknown> => null,
    findUnique: async (): Promise<unknown> => null,
    findMany: async (): Promise<unknown[]> => [],
    update: async (): Promise<unknown> => null,
    count: async (): Promise<number> => 0,
  };
}
