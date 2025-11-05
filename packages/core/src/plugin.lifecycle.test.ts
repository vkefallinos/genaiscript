import { describe, test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { writeFileSync, mkdirSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import {
    loadPlugin,
    loadPlugins,
    executeBeforeRunHooks,
    executeAfterRunHooks,
    executeErrorHooks,
} from "./pluginloader"
import { PluginLifecycleContext, PluginErrorContext } from "./plugin"

describe("plugin lifecycle hooks", () => {
    let testDir: string

    beforeEach(() => {
        testDir = join(tmpdir(), `genaiscript-lifecycle-test-${Date.now()}`)
        mkdirSync(testDir, { recursive: true })
    })

    afterEach(() => {
        try {
            rmSync(testDir, { recursive: true, force: true })
        } catch (error) {
            // Ignore cleanup errors
        }
    })

    describe("beforeRun hooks", () => {
        test("should execute beforeRun hooks", async () => {
            const pluginPath = join(testDir, "beforerun-plugin.js")
            const pluginCode = `
                export default {
                    name: 'beforerun-plugin',
                    setup: (extend, hooks) => {
                        let executed = false
                        hooks.beforeRun = hooks.beforeRun || []
                        hooks.beforeRun.push((context) => {
                            executed = true
                            context.beforeRunExecuted = true
                        })
                    }
                }
            `
            writeFileSync(pluginPath, pluginCode)

            const loaded = await loadPlugin(pluginPath, testDir)
            const context: PluginLifecycleContext = {}

            await executeBeforeRunHooks([loaded], context)

            assert.strictEqual(context.beforeRunExecuted, true)
        })

        test("should execute multiple beforeRun hooks in order", async () => {
            const pluginPath = join(testDir, "multi-beforerun-plugin.js")
            const pluginCode = `
                export default {
                    name: 'multi-beforerun-plugin',
                    setup: (extend, hooks) => {
                        hooks.beforeRun = hooks.beforeRun || []
                        hooks.beforeRun.push((context) => {
                            if (!context.order) context.order = []
                            context.order.push('first')
                        })
                        hooks.beforeRun.push((context) => {
                            if (!context.order) context.order = []
                            context.order.push('second')
                        })
                    }
                }
            `
            writeFileSync(pluginPath, pluginCode)

            const loaded = await loadPlugin(pluginPath, testDir)
            const context: PluginLifecycleContext = {}

            await executeBeforeRunHooks([loaded], context)

            assert.deepEqual(context.order, ["first", "second"])
        })

        test("should handle async beforeRun hooks", async () => {
            const pluginPath = join(testDir, "async-beforerun-plugin.js")
            const pluginCode = `
                export default {
                    name: 'async-beforerun-plugin',
                    setup: (extend, hooks) => {
                        hooks.beforeRun = hooks.beforeRun || []
                        hooks.beforeRun.push(async (context) => {
                            await new Promise(resolve => setTimeout(resolve, 10))
                            context.asyncCompleted = true
                        })
                    }
                }
            `
            writeFileSync(pluginPath, pluginCode)

            const loaded = await loadPlugin(pluginPath, testDir)
            const context: PluginLifecycleContext = {}

            await executeBeforeRunHooks([loaded], context)

            assert.strictEqual(context.asyncCompleted, true)
        })

        test("should throw error when beforeRun hook fails", async () => {
            const pluginPath = join(testDir, "failing-beforerun-plugin.js")
            const pluginCode = `
                export default {
                    name: 'failing-beforerun-plugin',
                    setup: (extend, hooks) => {
                        hooks.beforeRun = hooks.beforeRun || []
                        hooks.beforeRun.push((context) => {
                            throw new Error('Hook failed')
                        })
                    }
                }
            `
            writeFileSync(pluginPath, pluginCode)

            const loaded = await loadPlugin(pluginPath, testDir)
            const context: PluginLifecycleContext = {}

            await assert.rejects(
                async () => {
                    await executeBeforeRunHooks([loaded], context)
                },
                {
                    message: /beforeRun hook failed for plugin 'failing-beforerun-plugin'/,
                }
            )
        })
    })

    describe("afterRun hooks", () => {
        test("should execute afterRun hooks", async () => {
            const pluginPath = join(testDir, "afterrun-plugin.js")
            const pluginCode = `
                export default {
                    name: 'afterrun-plugin',
                    setup: (extend, hooks) => {
                        hooks.afterRun = hooks.afterRun || []
                        hooks.afterRun.push((context) => {
                            context.afterRunExecuted = true
                        })
                    }
                }
            `
            writeFileSync(pluginPath, pluginCode)

            const loaded = await loadPlugin(pluginPath, testDir)
            const context: PluginLifecycleContext = {}

            await executeAfterRunHooks([loaded], context)

            assert.strictEqual(context.afterRunExecuted, true)
        })

        test("should continue execution even if afterRun hook fails", async () => {
            const pluginPath1 = join(testDir, "failing-afterrun-plugin.js")
            const pluginCode1 = `
                export default {
                    name: 'failing-afterrun-plugin',
                    setup: (extend, hooks) => {
                        hooks.afterRun = hooks.afterRun || []
                        hooks.afterRun.push((context) => {
                            throw new Error('Hook failed')
                        })
                    }
                }
            `
            writeFileSync(pluginPath1, pluginCode1)

            const pluginPath2 = join(testDir, "success-afterrun-plugin.js")
            const pluginCode2 = `
                export default {
                    name: 'success-afterrun-plugin',
                    setup: (extend, hooks) => {
                        hooks.afterRun = hooks.afterRun || []
                        hooks.afterRun.push((context) => {
                            context.successExecuted = true
                        })
                    }
                }
            `
            writeFileSync(pluginPath2, pluginCode2)

            const loaded1 = await loadPlugin(pluginPath1, testDir)
            const loaded2 = await loadPlugin(pluginPath2, testDir)
            const context: PluginLifecycleContext = {}

            // Should not throw
            await executeAfterRunHooks([loaded1, loaded2], context)

            assert.strictEqual(context.successExecuted, true)
        })
    })

    describe("onError hooks", () => {
        test("should execute onError hooks with error context", async () => {
            const pluginPath = join(testDir, "onerror-plugin.js")
            const pluginCode = `
                export default {
                    name: 'onerror-plugin',
                    setup: (extend, hooks) => {
                        hooks.onError = hooks.onError || []
                        hooks.onError.push((context) => {
                            context.errorHandled = true
                            context.errorMessage = context.error.message
                        })
                    }
                }
            `
            writeFileSync(pluginPath, pluginCode)

            const loaded = await loadPlugin(pluginPath, testDir)
            const context: PluginErrorContext = {
                error: new Error("Test error"),
            }

            await executeErrorHooks([loaded], context)

            assert.strictEqual(context.errorHandled, true)
            assert.strictEqual(context.errorMessage, "Test error")
        })

        test("should continue execution even if onError hook fails", async () => {
            const pluginPath1 = join(testDir, "failing-onerror-plugin.js")
            const pluginCode1 = `
                export default {
                    name: 'failing-onerror-plugin',
                    setup: (extend, hooks) => {
                        hooks.onError = hooks.onError || []
                        hooks.onError.push((context) => {
                            throw new Error('Error handler failed')
                        })
                    }
                }
            `
            writeFileSync(pluginPath1, pluginCode1)

            const pluginPath2 = join(testDir, "success-onerror-plugin.js")
            const pluginCode2 = `
                export default {
                    name: 'success-onerror-plugin',
                    setup: (extend, hooks) => {
                        hooks.onError = hooks.onError || []
                        hooks.onError.push((context) => {
                            context.successExecuted = true
                        })
                    }
                }
            `
            writeFileSync(pluginPath2, pluginCode2)

            const loaded1 = await loadPlugin(pluginPath1, testDir)
            const loaded2 = await loadPlugin(pluginPath2, testDir)
            const context: PluginErrorContext = {
                error: new Error("Test error"),
            }

            // Should not throw
            await executeErrorHooks([loaded1, loaded2], context)

            assert.strictEqual(context.successExecuted, true)
        })
    })

    describe("multiple plugins with lifecycle hooks", () => {
        test("should execute hooks from multiple plugins in order", async () => {
            const plugin1Path = join(testDir, "plugin1.js")
            const plugin1Code = `
                export default {
                    name: 'plugin1',
                    priority: 10,
                    setup: (extend, hooks) => {
                        hooks.beforeRun = hooks.beforeRun || []
                        hooks.beforeRun.push((context) => {
                            if (!context.order) context.order = []
                            context.order.push('plugin1-before')
                        })
                        hooks.afterRun = hooks.afterRun || []
                        hooks.afterRun.push((context) => {
                            if (!context.order) context.order = []
                            context.order.push('plugin1-after')
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
                        hooks.beforeRun = hooks.beforeRun || []
                        hooks.beforeRun.push((context) => {
                            if (!context.order) context.order = []
                            context.order.push('plugin2-before')
                        })
                        hooks.afterRun = hooks.afterRun || []
                        hooks.afterRun.push((context) => {
                            if (!context.order) context.order = []
                            context.order.push('plugin2-after')
                        })
                    }
                }
            `
            writeFileSync(plugin2Path, plugin2Code)

            const plugins = await loadPlugins(
                [plugin1Path, plugin2Path],
                testDir
            )
            const context: PluginLifecycleContext = {}

            await executeBeforeRunHooks(plugins, context)
            await executeAfterRunHooks(plugins, context)

            // Higher priority plugin should execute first
            assert.deepEqual(context.order, [
                "plugin1-before",
                "plugin2-before",
                "plugin1-after",
                "plugin2-after",
            ])
        })
    })
})
