module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  // Unit lane: .spec.ts but NOT .it.spec.ts (integration is its own lane).
  testRegex: '(?<!\\.it)\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/../jest.setup.ts'],
};
