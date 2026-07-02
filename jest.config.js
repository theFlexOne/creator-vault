/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.types.ts',
    '!src/**/*.d.ts',
    '!src/db/scripts/**',
    '!src/db/seeds/**',
    '!src/db/seed_old/**',
    '!src/commands/index.ts',
    '!src/ingest/index.ts',
    '!src/lib/youtube/index.ts',
    '!src/index.ts',
    '!src/shared/types.ts',
    '!src/test-support/**',
  ],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  coverageThreshold: {
    global: {
      branches: 80,
      statements: 85,
      functions: 85,
      lines: 85,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}
