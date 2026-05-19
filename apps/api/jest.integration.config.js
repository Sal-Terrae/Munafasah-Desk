module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  // Integration suite only — units are .spec.ts (see jest.config.js).
  testRegex: '.*\\.it\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/../jest.setup.ts'],
  // Container startup needs ~10-15s on first pull. Plenty of headroom.
  testTimeout: 60_000,
  // Sequential workers: each suite spins up its own Postgres container
  // and parallel container startup overwhelms small machines.
  maxWorkers: 1,
};
