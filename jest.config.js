module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  roots: [
    '<rootDir>',
    '<rootDir>/../test',
    '<rootDir>/../tests',
  ],
  moduleNameMapper: {
    '^@api/(.*)$': '<rootDir>/api/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@database/(.*)$': '<rootDir>/database/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@workers/(.*)$': '<rootDir>/workers/$1',
  },
};
