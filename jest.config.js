module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // 프론트엔드는 node가 아닌 jsdom 환경 권장
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@01-app/(.*)$': '<rootDir>/src/01-app/$1',
    '^@02-processes/(.*)$': '<rootDir>/src/02-processes/$1',
    '^@03-pages/(.*)$': '<rootDir>/src/03-pages/$1',
    '^@04-widgets/(.*)$': '<rootDir>/src/04-widgets/$1',
    '^@05-features/(.*)$': '<rootDir>/src/05-features/$1',
    '^@06-entities/(.*)$': '<rootDir>/src/06-entities/$1',
    '^@07-shared/(.*)$': '<rootDir>/src/07-shared/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};