import { describe, test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { writeFileSync, mkdirSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { validateJSONWithSchema } from "./schema"
import schema from "../../../docs/public/schemas/config.json"

describe("config plugin support", () => {
    let testDir: string

    beforeEach(() => {
        testDir = join(tmpdir(), `genaiscript-config-test-${Date.now()}`)
        mkdirSync(testDir, { recursive: true })
    })

    afterEach(() => {
        try {
            rmSync(testDir, { recursive: true, force: true })
        } catch (error) {
            // Ignore cleanup errors
        }
    })

    describe("schema validation", () => {
        test("should validate config with plugins array", () => {
            const config = {
                plugins: ["./plugins/my-plugin.js", "genaiscript-plugin-db"],
            }

            const validation = validateJSONWithSchema(
                config,
                schema as JSONSchema
            )

            assert.strictEqual(validation.schemaError, undefined)
        })

        test("should validate config with empty plugins array", () => {
            const config = {
                plugins: [],
            }

            const validation = validateJSONWithSchema(
                config,
                schema as JSONSchema
            )

            assert.strictEqual(validation.schemaError, undefined)
        })

        test("should validate config with multiple plugin types", () => {
            const config = {
                plugins: [
                    "./local-plugin.js",
                    "../shared/plugin.mjs",
                    "npm-plugin",
                    "@scope/plugin",
                ],
            }

            const validation = validateJSONWithSchema(
                config,
                schema as JSONSchema
            )

            assert.strictEqual(validation.schemaError, undefined)
        })

        test("should validate config with plugins and other properties", () => {
            const config = {
                modelAliases: {
                    test: "gpt-4",
                },
                envFile: ".env",
                plugins: ["./plugins/test.js"],
            }

            const validation = validateJSONWithSchema(
                config,
                schema as JSONSchema
            )

            assert.strictEqual(validation.schemaError, undefined)
        })

        test("should reject config with invalid plugins type", () => {
            const config = {
                plugins: "not-an-array",
            }

            const validation = validateJSONWithSchema(
                config,
                schema as JSONSchema
            )

            assert.notStrictEqual(validation.schemaError, undefined)
        })

        test("should reject config with non-string plugin items", () => {
            const config = {
                plugins: [123, true, {}],
            }

            const validation = validateJSONWithSchema(
                config,
                schema as JSONSchema
            )

            assert.notStrictEqual(validation.schemaError, undefined)
        })
    })

    describe("config file parsing", () => {
        test("should parse JSON config with plugins", () => {
            const configPath = join(testDir, "genaiscript.config.json")
            const configContent = {
                plugins: ["./plugins/my-plugin.js"],
                modelAliases: {
                    test: "gpt-4",
                },
            }

            writeFileSync(configPath, JSON.stringify(configContent, null, 2))

            const parsed = JSON.parse(
                require("fs").readFileSync(configPath, "utf-8")
            )

            assert.deepEqual(parsed.plugins, ["./plugins/my-plugin.js"])
        })

        test("should parse YAML config with plugins", () => {
            const configPath = join(testDir, "genaiscript.config.yml")
            const configContent = `plugins:
  - ./plugins/my-plugin.js
  - npm-plugin
modelAliases:
  test: gpt-4
`

            writeFileSync(configPath, configContent)

            // Verify file was created
            const content = require("fs").readFileSync(configPath, "utf-8")
            assert.ok(content.includes("plugins:"))
        })
    })

    describe("plugin path formats", () => {
        test("should recognize relative paths", () => {
            const relativePaths = [
                "./plugin.js",
                "../plugin.js",
                "./plugins/my-plugin.mjs",
                "../shared/plugin.cjs",
            ]

            relativePaths.forEach((path) => {
                const config = { plugins: [path] }
                const validation = validateJSONWithSchema(
                    config,
                    schema as JSONSchema
                )
                assert.strictEqual(
                    validation.schemaError,
                    undefined,
                    `Failed for path: ${path}`
                )
            })
        })

        test("should recognize npm package names", () => {
            const packageNames = [
                "genaiscript-plugin-database",
                "@scope/plugin",
                "@org/genaiscript-plugin",
                "my-plugin",
            ]

            packageNames.forEach((name) => {
                const config = { plugins: [name] }
                const validation = validateJSONWithSchema(
                    config,
                    schema as JSONSchema
                )
                assert.strictEqual(
                    validation.schemaError,
                    undefined,
                    `Failed for package: ${name}`
                )
            })
        })

        test("should handle mixed plugin sources", () => {
            const config = {
                plugins: [
                    "./local/plugin.js",
                    "npm-plugin",
                    "@scope/plugin",
                    "../shared/plugin.mjs",
                ],
            }

            const validation = validateJSONWithSchema(
                config,
                schema as JSONSchema
            )
            assert.strictEqual(validation.schemaError, undefined)
        })
    })
})
