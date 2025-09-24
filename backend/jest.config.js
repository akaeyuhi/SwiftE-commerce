module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: './',
    testTimeout: 30000,
    setupFiles: [
        "<rootDir>config.ts"
    ],
    moduleFileExtensions: ['js', 'json', 'ts'],
    testRegex: '(/test/.*|(\\.|/)(spec|test))\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': [
            "ts-jest",
            {
                "compiler": "ttypescript"
            }
        ],
    },
    moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1'
    },
    coverageDirectory: '<rootDir>/coverage',
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/main.ts',
        '!src/**/index.ts',
        '!src/**/*.module.ts'
    ],
};
