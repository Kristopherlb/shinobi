export default {
  displayName: 'core',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/core',
  moduleNameMapping: {
    '^@shinobi/core$': '<rootDir>/src/index.ts',
    '^@shinobi/standards-logging$': '<rootDir>/../../packages/standards/logging/src/index.ts',
    '^@shinobi/standards-otel$': '<rootDir>/../../packages/standards/otel/src/index.ts',
    '^@shinobi/standards-tagging$': '<rootDir>/../../packages/standards/tagging/src/index.ts',
    '^@shinobi/standards-iam-audit$': '<rootDir>/../../packages/standards/iam-audit/src/index.ts',
    '^@shinobi/standards-deprecation$': '<rootDir>/../../packages/standards/deprecation/src/index.ts',
    '^@shinobi/mcp-server$': '<rootDir>/../../packages/mcp/server/src/index.ts',
    '^@shinobi/constructs-prd$': '<rootDir>/../../packages/constructs/prd/src/index.ts'
  }
};
