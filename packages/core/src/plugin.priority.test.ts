import { describe, test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { writeFileSync, mkdirSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { loadPlugins, applyPluginExtensions } from "./pluginloader"
import { PluginExtensionContext } from "./plugin"

describe("plugin priorities and ordering", () => {
    let testDir: string

    beforeEach(() => {
        testDir = join(tmpdir(), `genaiscript-priority-test-${Date.now()}`)
        mkdirSync(testDir, { recursive: true })
    })

    afterEach(() => {
        try {
            rmSync(testDir, { recursive: true, force: true })
        } catch (error) {
            // Ignore cleanup errors
        }
    })

    describe("priority ordering", () => {
        test("should load plugins in priority order (higher first)", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    priority: 1,
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin1')
                        })
                    }
                }
            `
            writeFileSync(plugin1Path, plugin1Code)

            const plugin2Path = join(testDir, "plugin2.js")
            const plugin2Code = `
                export default {
                    name: 'plugin2',
                    priority: 10,
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin2')
                        })
                    }
                }
            `
            writeFileSync(plugin2Path, plugin2Code)

            const plugin3Path = join(testDir, "plugin3.js")
            const plugin3Code = `
                export default {
                    name: 'plugin3',
                    priority: 5,
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin3')
                        })
                    }
                }
            `
            writeFileSync(plugin3Path, plugin3Code)

            const plugins = await loadPlugins(
                [plugin1Path, plugin2Path, plugin3Path],
                testDir
            )
            const context: PluginExtensionContext = {}

            applyPluginExtensions(plugins, context)

            // Should execute in order: plugin2 (10), plugin3 (5), plugin1 (1)
            assert.deepEqual(context.global?.order, [
                "plugin2",
                "plugin3",
                "plugin1",
            ])
        })

        test("should use default priority of 0 if not specified", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin1')
                        })
                    }
                }
            `
            writeFileSync(plugin1Path, plugin1Code)

            const plugin2Path = join(testDir, "plugin2.js")
            const plugin2Code = `
                export default {
                    name: 'plugin2',
                    priority: 5,
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin2')
                        })
                    }
                }
            `
            writeFileSync(plugin2Path, plugin2Code)

            const plugins = await loadPlugins(
                [plugin1Path, plugin2Path],
                testDir
            )
            const context: PluginExtensionContext = {}

            applyPluginExtensions(plugins, context)

            // plugin2 (priority 5) should come before plugin1 (priority 0)
            assert.deepEqual(context.global?.order, ["plugin2", "plugin1"])
        })

        test("should handle negative priorities", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    priority: -5,
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin1')
                        })
                    }
                }
            `
            writeFileSync(plugin1Path, plugin1Code)

            const plugin2Path = join(testDir, "plugin2.js")
            const plugin2Code = `
                export default {
                    name: 'plugin2',
                    priority: 0,
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin2')
                        })
                    }
                }
            `
            writeFileSync(plugin2Path, plugin2Code)

            const plugins = await loadPlugins(
                [plugin1Path, plugin2Path],
                testDir
            )
            const context: PluginExtensionContext = {}

            applyPluginExtensions(plugins, context)

            // plugin2 (0) should come before plugin1 (-5)
            assert.deepEqual(context.global?.order, ["plugin2", "plugin1"])
        })
    })

    describe("dependency resolution", () => {
        test("should load plugins in dependency order", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    dependencies: ['plugin2'],
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin1')
                        })
                    }
                }
            `
            writeFileSync(plugin1Path, plugin1Code)

            const plugin2Path = join(testDir, "plugin2.js")
            const plugin2Code = `
                export default {
                    name: 'plugin2',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin2')
                        })
                    }
                }
            `
            writeFileSync(plugin2Path, plugin2Code)

            const plugins = await loadPlugins(
                [plugin1Path, plugin2Path],
                testDir
            )
            const context: PluginExtensionContext = {}

            applyPluginExtensions(plugins, context)

            // plugin2 should execute before plugin1
            assert.deepEqual(context.global?.order, ["plugin2", "plugin1"])
        })

        test("should handle multiple dependencies", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    dependencies: ['plugin2', 'plugin3'],
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin1')
                        })
                    }
                }
            `
            writeFileSync(plugin1Path, plugin1Code)

            const plugin2Path = join(testDir, "plugin2.js")
            const plugin2Code = `
                export default {
                    name: 'plugin2',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin2')
                        })
                    }
                }
            `
            writeFileSync(plugin2Path, plugin2Code)

            const plugin3Path = join(testDir, "plugin3.js")
            const plugin3Code = `
                export default {
                    name: 'plugin3',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin3')
                        })
                    }
                }
            `
            writeFileSync(plugin3Path, plugin3Code)

            const plugins = await loadPlugins(
                [plugin1Path, plugin2Path, plugin3Path],
                testDir
            )
            const context: PluginExtensionContext = {}

            applyPluginExtensions(plugins, context)

            // plugin1 should be last
            const order = context.global?.order || []
            assert.strictEqual(order[2], "plugin1")
            assert.ok(order.includes("plugin2"))
            assert.ok(order.includes("plugin3"))
        })

        test("should throw error for missing dependencies", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    dependencies: ['nonexistent-plugin'],
                    setup: (extend, hooks) => {
                        extend((context) => {})
                    }
                }
            `
            writeFileSync(plugin1Path, plugin1Code)

            await assert.rejects(
                async () => {
                    await loadPlugins([plugin1Path], testDir)
                },
                {
                    message: /Plugin 'plugin1' depends on 'nonexistent-plugin' which is not loaded/,
                }
            )
        })

        test("should detect circular dependencies", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    dependencies: ['plugin2'],
                    setup: (extend, hooks) => {
                        extend((context) => {})
                    }
                }
            `
            writeFileSync(plugin1Path, plugin1Code)

            const plugin2Path = join(testDir, "plugin2.js")
            const plugin2Code = `
                export default {
                    name: 'plugin2',
                    dependencies: ['plugin1'],
                    setup: (extend, hooks) => {
                        extend((context) => {})
                    }
                }
            `
            writeFileSync(plugin2Path, plugin2Code)

            await assert.rejects(
                async () => {
                    await loadPlugins([plugin1Path, plugin2Path], testDir)
                },
                {
                    message: /Circular dependency detected/,
                }
            )
        })

        test("should handle transitive dependencies", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    dependencies: ['plugin2'],
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin1')
                        })
                    }
                }
            `
            writeFileSync(plugin1Path, plugin1Code)

            const plugin2Path = join(testDir, "plugin2.js")
            const plugin2Code = `
                export default {
                    name: 'plugin2',
                    dependencies: ['plugin3'],
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin2')
                        })
                    }
                }
            `
            writeFileSync(plugin2Path, plugin2Code)

            const plugin3Path = join(testDir, "plugin3.js")
            const plugin3Code = `
                export default {
                    name: 'plugin3',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin3')
                        })
                    }
                }
            `
            writeFileSync(plugin3Path, plugin3Code)

            const plugins = await loadPlugins(
                [plugin1Path, plugin2Path, plugin3Path],
                testDir
            )
            const context: PluginExtensionContext = {}

            applyPluginExtensions(plugins, context)

            // Should execute in order: plugin3, plugin2, plugin1
            assert.deepEqual(context.global?.order, [
                "plugin3",
                "plugin2",
                "plugin1",
            ])
        })
    })

    describe("priority with dependencies", () => {
        test("should respect dependencies over priority", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    priority: 100,
                    dependencies: ['plugin2'],
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin1')
                        })
                    }
                }
            `
            writeFileSync(plugin1Path, plugin1Code)

            const plugin2Path = join(testDir, "plugin2.js")
            const plugin2Code = `
                export default {
                    name: 'plugin2',
                    priority: 1,
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            if (!context.global.order) context.global.order = []
                            context.global.order.push('plugin2')
                        })
                    }
                }
            `
            writeFileSync(plugin2Path, plugin2Code)

            const plugins = await loadPlugins(
                [plugin1Path, plugin2Path],
                testDir
            )
            const context: PluginExtensionContext = {}

            applyPluginExtensions(plugins, context)

            // plugin2 must execute before plugin1 due to dependency
            assert.deepEqual(context.global?.order, ["plugin2", "plugin1"])
        })
    })
})
