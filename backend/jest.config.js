module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testPathIgnorePatterns: ["<rootDir>/dist/", '<rootDir>/test/unit/helpers/'],
    rootDir: './',
    testTimeout: 30000,
    moduleFileExtensions: ['js', 'json', 'ts'],
    testRegex: '(/test/.*|(\\.|/)(spec|test))\\.ts$',
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1',
        '^test/(.*)$': '<rootDir>/test/$1'
    },
    coverageDirectory: '<rootDir>/coverage',
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/main.ts',
        '!src/**/index.ts',
        '!src/**/*.module.ts'
    ],
};
