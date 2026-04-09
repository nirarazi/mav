// Lightweight stub for @mav/nestjs-libraries/* imports.
// Prevents ts-jest from compiling the entire nestjs-libraries tree.
// Real mocking is done via jest.mock() in test files.

export class PrismaService {
  engagementAutonomy = {
    findUnique: async (): Promise<unknown> => null,
    upsert: async (): Promise<unknown> => null,
    findMany: async (): Promise<unknown[]> => [],
  };
}
