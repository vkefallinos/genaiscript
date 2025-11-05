import { describe, test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { writeFileSync, mkdirSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import {
    loadPlugin,
    loadPlugins,
    applyPluginExtensions,
} from "./pluginloader"
import { PluginExtensionContext } from "./plugin"

describe("pluginloader", () => {
    let testDir: string

    beforeEach(() => {
        // Create a temporary directory for test files
        testDir = join(tmpdir(), `genaiscript-plugin-test-${Date.now()}`)
        mkdirSync(testDir, { recursive: true })
    })

    afterEach(() => {
        // Clean up test directory
        try {
            rmSync(testDir, { recursive: true, force: true })
        } catch (error) {
            // Ignore cleanup errors
        }
    })

    describe("loadPlugin", () => {
        test("should load a valid plugin from a local file", async () => {
            const pluginPath = join(testDir, "test-plugin.js")
            const pluginCode = `
                export default {
                    name: 'test-plugin',
                    setup: (extend) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.testFn = () => 'works'
                        })
                    }
                }
            `
            writeFileSync(pluginPath, pluginCode)

            const loaded = await loadPlugin(pluginPath, testDir)

            assert.strictEqual(loaded.definition.name, "test-plugin")
            assert.strictEqual(loaded.source, pluginPath)
            assert.strictEqual(loaded.extensions.length, 1)
        })

        test("should load plugin from relative path", async () => {
            const pluginPath = join(testDir, "plugins", "my-plugin.js")
            mkdirSync(join(testDir, "plugins"), { recursive: true })

            const pluginCode = `
                export default {
                    name: 'relative-plugin',
                    setup: (extend) => {
                        extend((context) => {})
                    }
                }
            `
            writeFileSync(pluginPath, pluginCode)

            const loaded = await loadPlugin(
                "./plugins/my-plugin.js",
                testDir
            )

            assert.strictEqual(loaded.definition.name, "relative-plugin")
        })

        test("should resolve plugin with common extensions", async () => {
            const pluginPath = join(testDir, "test-plugin.mjs")
            const pluginCode = `
                export default {
                    name: 'mjs-plugin',
                    setup: (extend) => {
                        extend((context) => {})
                    }
                }
            `
            writeFileSync(pluginPath, pluginCode)

            // Load without extension
            const loaded = await loadPlugin("./test-plugin", testDir)

            assert.strictEqual(loaded.definition.name, "mjs-plugin")
        })

        test("should throw error for missing plugin file", async () => {
            await assert.rejects(
                async () => {
                    await loadPlugin("./non-existent-plugin.js", testDir)
                },
                {
                    message: /Plugin file not found/,
                }
            )
        })

        test("should throw error for plugin without name", async () => {
            const pluginPath = join(testDir, "invalid-plugin.js")
            const pluginCode = `
                export default {
                    setup: (extend) => {}
                }
            `
            writeFileSync(pluginPath, pluginCode)

            await assert.rejects(
                async () => {
                    await loadPlugin(pluginPath, testDir)
                },
                {
                    message: /must have a 'name' property/,
                }
            )
        })

        test("should throw error for plugin without setup function", async () => {
            const pluginPath = join(testDir, "invalid-plugin.js")
            const pluginCode = `
                export default {
                    name: 'invalid'
                }
            `
            writeFileSync(pluginPath, pluginCode)

            await assert.rejects(
                async () => {
                    await loadPlugin(pluginPath, testDir)
                },
                {
                    message: /must have a 'setup' property of type function/,
                }
            )
        })

        test("should support named plugin export", async () => {
            const pluginPath = join(testDir, "named-export.js")
            const pluginCode = `
                export const plugin = {
                    name: 'named-plugin',
                    setup: (extend) => {
                        extend((context) => {})
                    }
                }
            `
            writeFileSync(pluginPath, pluginCode)

            const loaded = await loadPlugin(pluginPath, testDir)

            assert.strictEqual(loaded.definition.name, "named-plugin")
        })

        test("should throw error if plugin setup fails", async () => {
            const pluginPath = join(testDir, "failing-plugin.js")
            const pluginCode = `
                export default {
                    name: 'failing-plugin',
                    setup: (extend) => {
                        throw new Error('Setup failed')
                    }
                }
            `
            writeFileSync(pluginPath, pluginCode)

            await assert.rejects(
                async () => {
                    await loadPlugin(pluginPath, testDir)
                },
                {
                    message: /setup failed/i,
                }
            )
        })

        test("should support async setup", async () => {
            const pluginPath = join(testDir, "async-plugin.js")
            const pluginCode = `
                export default {
                    name: 'async-plugin',
                    setup: async (extend) => {
                        await new Promise(resolve => setTimeout(resolve, 1))
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.asyncFn = () => 'async'
                        })
                    }
                }
            `
            writeFileSync(pluginPath, pluginCode)

            const loaded = await loadPlugin(pluginPath, testDir)

            assert.strictEqual(loaded.definition.name, "async-plugin")
            assert.strictEqual(loaded.extensions.length, 1)
        })

        test("should collect multiple extensions from plugin", async () => {
            const pluginPath = join(testDir, "multi-extend.js")
            const pluginCode = `
                export default {
                    name: 'multi-extend',
                    setup: (extend) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.fn1 = () => {}
                        })
                        extend((context) => {
                            if (!context.workspace) context.workspace = {}
                            context.workspace.fn2 = () => {}
                        })
                        extend((context) => {
                            if (!context.parsers) context.parsers = {}
                            context.parsers.fn3 = () => {}
                        })
                    }
                }
            `
            writeFileSync(pluginPath, pluginCode)

            const loaded = await loadPlugin(pluginPath, testDir)

            assert.strictEqual(loaded.extensions.length, 3)
        })
    })

    describe("loadPlugins", () => {
        test("should load multiple plugins", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin2Path = join(testDir, "plugin2.js")

            writeFileSync(
                plugin1Path,
                `
                export default {
                    name: 'plugin1',
                    setup: (extend) => {
                        extend((context) => {})
                    }
                }
            `
            )

            writeFileSync(
                plugin2Path,
                `
                export default {
                    name: 'plugin2',
                    setup: (extend) => {
                        extend((context) => {})
                    }
                }
            `
            )

            const plugins = await loadPlugins(
                ["./plugin1.js", "./plugin2.js"],
                testDir
            )

            assert.strictEqual(plugins.length, 2)
            assert.strictEqual(plugins[0].definition.name, "plugin1")
            assert.strictEqual(plugins[1].definition.name, "plugin2")
        })

        test("should throw error if any plugin fails to load", async () => {
            const plugin1Path = join(testDir, "plugin1.js")

            writeFileSync(
                plugin1Path,
                `
                export default {
                    name: 'plugin1',
                    setup: (extend) => {
                        extend((context) => {})
                    }
                }
            `
            )

            await assert.rejects(
                async () => {
                    await loadPlugins(
                        ["./plugin1.js", "./non-existent.js"],
                        testDir
                    )
                },
                {
                    message: /Failed to load plugins/,
                }
            )
        })

        test("should handle empty plugin array", async () => {
            const plugins = await loadPlugins([], testDir)

            assert.strictEqual(plugins.length, 0)
        })
    })

    describe("applyPluginExtensions", () => {
        test("should apply plugin extensions to context", async () => {
            const pluginPath = join(testDir, "test-plugin.js")
            const pluginCode = `
                export default {
                    name: 'test-plugin',
                    setup: (extend) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.testFn = () => 'result'
                        })
                    }
                }
            `
            writeFileSync(pluginPath, pluginCode)

            const loaded = await loadPlugin(pluginPath, testDir)
            const context: PluginExtensionContext = {}

            applyPluginExtensions([loaded], context)

            assert.strictEqual(typeof context.global?.testFn, "function")
            assert.strictEqual(context.global?.testFn(), "result")
        })

        test("should apply multiple plugin extensions", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin2Path = join(testDir, "plugin2.js")

            writeFileSync(
                plugin1Path,
                `
                export default {
                    name: 'plugin1',
                    setup: (extend) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.fn1 = () => 'p1'
                        })
                    }
                }
            `
            )

            writeFileSync(
                plugin2Path,
                `
                export default {
                    name: 'plugin2',
                    setup: (extend) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.fn2 = () => 'p2'
                        })
                    }
                }
            `
            )

            const plugins = await loadPlugins(
                ["./plugin1.js", "./plugin2.js"],
                testDir
            )
            const context: PluginExtensionContext = {}

            applyPluginExtensions(plugins, context)

            assert.strictEqual(context.global?.fn1(), "p1")
            assert.strictEqual(context.global?.fn2(), "p2")
        })

        test("should apply extensions from plugins in order", async () => {
            const pluginPath = join(testDir, "order-plugin.js")
            const pluginCode = `
                export default {
                    name: 'order-plugin',
                    setup: (extend) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.order = ['first']
                        })
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('second')
                        })
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('third')
                        })
                    }
                }
            `
            writeFileSync(pluginPath, pluginCode)

            const loaded = await loadPlugin(pluginPath, testDir)
            const context: PluginExtensionContext = {}

            applyPluginExtensions([loaded], context)

            assert.deepEqual(context.global?.order, ["first", "second", "third"])
        })

        test("should throw error if extension fails", async () => {
            const pluginPath = join(testDir, "failing-extension.js")
            const pluginCode = `
                export default {
                    name: 'failing-extension',
                    setup: (extend) => {
                        extend((context) => {
                            throw new Error('Extension failed')
                        })
                    }
                }
            `
            writeFileSync(pluginPath, pluginCode)

            const loaded = await loadPlugin(pluginPath, testDir)
            const context: PluginExtensionContext = {}

            assert.throws(
                () => {
                    applyPluginExtensions([loaded], context)
                },
                {
                    message: /Extension failed/,
                }
            )
        })

        test("should handle empty plugin array", () => {
            const context: PluginExtensionContext = {}

            // Should not throw
            applyPluginExtensions([], context)

            assert.deepEqual(context, {})
        })
    })
})
