import { describe, test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { writeFileSync, mkdirSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { loadPlugins, applyPluginExtensions } from "./pluginloader"
import {
    PluginExtensionContext,
    ConflictResolutionStrategy,
} from "./plugin"

describe("plugin conflict resolution", () => {
    let testDir: string

    beforeEach(() => {
        testDir = join(tmpdir(), `genaiscript-conflict-test-${Date.now()}`)
        mkdirSync(testDir, { recursive: true })
    })

    afterEach(() => {
        try {
            rmSync(testDir, { recursive: true, force: true })
        } catch (error) {
            // Ignore cleanup errors
        }
    })

    describe("WARN_OVERRIDE strategy", () => {
        test("should warn when plugins override same property", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.sharedFunction = () => 'plugin1'
                        })
                    }
                }
            `
            writeFileSync(plugin1Path, plugin1Code)

            const plugin2Path = join(testDir, "plugin2.js")
            const plugin2Code = `
                export default {
                    name: 'plugin2',
                    conflictResolution: 'warn_override',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.sharedFunction = () => 'plugin2'
                        })
                    }
                }
            `
            writeFileSync(plugin2Path, plugin2Code)

            const plugins = await loadPlugins([plugin1Path, plugin2Path], testDir)
            const context: PluginExtensionContext = {}

            // Should not throw, but warn
            applyPluginExtensions(plugins, context)

            // Last plugin wins
            assert.strictEqual(
                context.global?.sharedFunction(),
                "plugin2"
            )
        })

        test("should allow non-conflicting properties", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.function1 = () => 'plugin1'
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
                            context.global.function2 = () => 'plugin2'
                        })
                    }
                }
            `
            writeFileSync(plugin2Path, plugin2Code)

            const plugins = await loadPlugins([plugin1Path, plugin2Path], testDir)
            const context: PluginExtensionContext = {}

            applyPluginExtensions(plugins, context)

            assert.strictEqual(context.global?.function1(), "plugin1")
            assert.strictEqual(context.global?.function2(), "plugin2")
        })
    })

    describe("ERROR strategy", () => {
        test("should throw error on property conflict", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.sharedFunction = () => 'plugin1'
                        })
                    }
                }
            `
            writeFileSync(plugin1Path, plugin1Code)

            const plugin2Path = join(testDir, "plugin2.js")
            const plugin2Code = `
                export default {
                    name: 'plugin2',
                    conflictResolution: 'error',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.sharedFunction = () => 'plugin2'
                        })
                    }
                }
            `
            writeFileSync(plugin2Path, plugin2Code)

            const plugins = await loadPlugins([plugin1Path, plugin2Path], testDir)
            const context: PluginExtensionContext = {}

            assert.throws(
                () => {
                    applyPluginExtensions(plugins, context)
                },
                {
                    message: /Plugin 'plugin2' is overriding 'global.sharedFunction' previously set by plugin 'plugin1'/,
                }
            )
        })
    })

    describe("MERGE strategy", () => {
        test("should merge object properties", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.config = { option1: true, shared: 'plugin1' }
                        })
                    }
                }
            `
            writeFileSync(plugin1Path, plugin1Code)

            const plugin2Path = join(testDir, "plugin2.js")
            const plugin2Code = `
                export default {
                    name: 'plugin2',
                    conflictResolution: 'merge',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.config = { option2: false, shared: 'plugin2' }
                        })
                    }
                }
            `
            writeFileSync(plugin2Path, plugin2Code)

            const plugins = await loadPlugins([plugin1Path, plugin2Path], testDir)
            const context: PluginExtensionContext = {}

            applyPluginExtensions(plugins, context)

            assert.strictEqual(context.global?.config.option1, true)
            assert.strictEqual(context.global?.config.option2, false)
            // Last value wins for overlapping properties
            assert.strictEqual(context.global?.config.shared, "plugin2")
        })

        test("should merge array properties", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.items = ['item1', 'item2']
                        })
                    }
                }
            `
            writeFileSync(plugin1Path, plugin1Code)

            const plugin2Path = join(testDir, "plugin2.js")
            const plugin2Code = `
                export default {
                    name: 'plugin2',
                    conflictResolution: 'merge',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.items = ['item3', 'item4']
                        })
                    }
                }
            `
            writeFileSync(plugin2Path, plugin2Code)

            const plugins = await loadPlugins([plugin1Path, plugin2Path], testDir)
            const context: PluginExtensionContext = {}

            applyPluginExtensions(plugins, context)

            assert.deepEqual(context.global?.items, [
                "item1",
                "item2",
                "item3",
                "item4",
            ])
        })
    })

    describe("PRIORITY strategy", () => {
        test("should respect plugin priority for conflicts", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    priority: 5,
                    conflictResolution: 'priority',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.sharedFunction = () => 'plugin1-priority5'
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
                    conflictResolution: 'priority',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.sharedFunction = () => 'plugin2-priority10'
                        })
                    }
                }
            `
            writeFileSync(plugin2Path, plugin2Code)

            const plugins = await loadPlugins([plugin1Path, plugin2Path], testDir)
            const context: PluginExtensionContext = {}

            applyPluginExtensions(plugins, context)

            // Higher priority plugin (plugin2) should win
            assert.strictEqual(
                context.global?.sharedFunction(),
                "plugin2-priority10"
            )
        })
    })

    describe("multiple context extensions", () => {
        test("should detect conflicts across different contexts", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    setup: (extend, hooks) => {
                        extend((context) => {
                            if (!context.global) context.global = {}
                            context.global.util = () => 'global1'
                            if (!context.workspace) context.workspace = {}
                            context.workspace.query = () => 'workspace1'
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
                            context.global.util = () => 'global2'
                            if (!context.parsers) context.parsers = {}
                            context.parsers.readCustom = () => 'parser2'
                        })
                    }
                }
            `
            writeFileSync(plugin2Path, plugin2Code)

            const plugins = await loadPlugins([plugin1Path, plugin2Path], testDir)
            const context: PluginExtensionContext = {}

            // Should warn about global.util conflict
            applyPluginExtensions(plugins, context)

            assert.strictEqual(context.global?.util(), "global2")
            assert.strictEqual(context.workspace?.query(), "workspace1")
            assert.strictEqual(context.parsers?.readCustom(), "parser2")
        })
    })
})
