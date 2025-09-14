// Mock implementation of @dagger.io/dagger for testing

const mockContainer = {
  from: jest.fn().mockReturnThis(),
  withWorkdir: jest.fn().mockReturnThis(),
  withMountedDirectory: jest.fn().mockReturnThis(),
  withExec: jest.fn().mockReturnThis(),
  withEnvVariable: jest.fn().mockReturnThis(),
  withSecretVariable: jest.fn().mockReturnThis(),
  withExposedPort: jest.fn().mockReturnThis(),
  asService: jest.fn().mockReturnThis(),
  stdout: jest.fn().mockResolvedValue('Mock output'),
  stderr: jest.fn().mockResolvedValue('Mock error output'),
};

const mockHost = {
  directory: jest.fn().mockReturnValue('mock-directory'),
  file: jest.fn().mockReturnValue('mock-file'),
};

const mockSecret = jest.fn().mockReturnValue('mock-secret');

const mockDag = {
  container: jest.fn(() => mockContainer),
  host: jest.fn(() => mockHost),
  setSecret: mockSecret,
  withConfig: jest.fn().mockReturnThis(),
};

module.exports = {
  dag: mockDag,
  Container: jest.fn(),
  Directory: jest.fn(),
  Secret: jest.fn(),
  Service: jest.fn(),
};
