import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest/presets/default-esm",
    testEnvironment: "node",
    collectCoverage: true,

    transform: {
    "^.+\\.[tj]s$": ["ts-jest", { useESM: true }]
    },

    extensionsToTreatAsEsm: [".ts"],

    moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
    }
};

export default config;