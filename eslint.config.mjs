import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default [
    {
        ignores: ['**/eslint.config.mjs'],
    },
    ...fixupConfigRules(
        compat.extends(
            'plugin:react/recommended',
            'plugin:@typescript-eslint/recommended',
            'plugin:prettier/recommended'
        )
    ),
    {
        plugins: {
            react: fixupPluginRules(react),
            'react-hooks': fixupPluginRules(reactHooks),
            '@typescript-eslint': fixupPluginRules(typescriptEslint),
            prettier: fixupPluginRules(prettier),
        },

        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },

            parser: tsParser,
            ecmaVersion: 5,
            sourceType: 'module',

            parserOptions: {
                projectService: ['./tsconfig.json', './backend/tsconfig.json', './tsconfig.node.json', './frontend/tsconfig.json',],
                tsconfigRootDir: './',
            },
        },

        rules: {
            'prettier/prettier': [
              'error',
                {
                    "semi": true,
                    "tabWidth": 2,
                    "printWidth": 80,
                    "singleQuote": true,
                    "trailingComma": "es5"
                }

            ],
            '@typescript-eslint/interface-name-prefix': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/object-curly-spacing': 'off',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'import/prefer-default-export': 'off',
            'import/extensions': 'off',
            'import/no-extraneous-dependencies': 'off',
            'linebreak-style': ['error', 'unix'],

            quotes: [
                'error',
                'single',
                {
                    allowTemplateLiterals: true,
                },
            ],

            semi: ['error', 'always'],
            'no-loop-func': ['error'],
            'block-spacing': ['error', 'always'],
            camelcase: ['error'],
            eqeqeq: ['error', 'always'],

            'brace-style': [
                'error',
                '1tbs',
                {
                    allowSingleLine: true,
                },
            ],

            'comma-style': ['error', 'last'],

            'comma-spacing': [
                'error',
                {
                    before: false,
                    after: true,
                },
            ],

            'eol-last': ['error'],
            'func-call-spacing': ['error', 'never'],

            'key-spacing': [
                'error',
                {
                    beforeColon: false,
                    afterColon: true,
                    mode: 'minimum',
                },
            ],

            'max-len': [
                'error',
                {
                    code: 100,
                    ignoreUrls: true,
                },
            ],

            'max-nested-callbacks': [
                'error',
                {
                    max: 7,
                },
            ],

            'new-cap': [
                'error',
                {
                    newIsCap: true,
                    capIsNew: false,
                    properties: true,
                },
            ],

            'new-parens': ['error'],
            'no-lonely-if': ['error'],
            'no-trailing-spaces': ['error'],
            'no-unneeded-ternary': ['error'],
            'no-whitespace-before-property': ['error'],
            'object-curly-spacing': ['error', 'always'],
            'operator-assignment': ['error', 'always'],

            'semi-spacing': [
                'error',
                {
                    before: false,
                    after: true,
                },
            ],

            'space-before-blocks': ['error', 'always'],

            'space-before-function-paren': [
                'error',
                {
                    anonymous: 'never',
                    named: 'never',
                    asyncArrow: 'always',
                },
            ],

            'space-in-parens': ['error', 'never'],
            'space-infix-ops': ['error'],

            'space-unary-ops': [
                'error',
                {
                    words: true,
                    nonwords: false,

                    overrides: {
                        typeof: false,
                    },
                },
            ],

            'no-unreachable': ['error'],
            'no-global-assign': ['error'],
            'no-self-compare': ['error'],
            'no-unmodified-loop-condition': ['error'],

            'no-constant-condition': [
                'error',
                {
                    checkLoops: false,
                },
            ],

            'no-console': ['off'],
            'no-useless-concat': ['error'],
            'no-useless-escape': ['error'],
            'no-shadow-restricted-names': ['error'],

            'no-use-before-define': [
                'error',
                {
                    functions: false,
                },
            ],

            'arrow-body-style': ['error', 'as-needed'],
            'arrow-spacing': ['error'],
            'no-useless-computed-key': ['error'],
            'no-useless-rename': ['error'],
            'no-var': ['error'],
            'object-shorthand': ['error', 'always'],
            'prefer-arrow-callback': ['error'],
            'prefer-const': ['error'],
            'prefer-numeric-literals': ['error'],
            'prefer-rest-params': ['error'],
            'prefer-spread': ['error'],
            'rest-spread-spacing': ['error', 'never'],
            'template-curly-spacing': ['error', 'never'],
        },
    },
    {
        files: ['**/*.ts', '**/*.tsx'],

        languageOptions: {
            ecmaVersion: 12,
            sourceType: 'script',

            parserOptions: {
                project: ['./tsconfig.json'],
            },
        },
    },
];
