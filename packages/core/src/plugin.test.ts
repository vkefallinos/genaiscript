import { describe, test, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { plugin, PluginDefinition, PluginExtensionContext } from "./plugin"

describe("plugin", () => {
    describe("plugin function", () => {
        test("should create a valid plugin definition", () => {
            const pluginDef = plugin({
                name: "test-plugin",
                setup: (extend, hooks) => {
                    extend((context) => {
                        context.global = { test: true }
                    })
                },
            })

            assert.strictEqual(pluginDef.name, "test-plugin")
            assert.strictEqual(typeof pluginDef.setup, "function")
        })

        test("should preserve plugin definition properties", () => {
            const setupFn = (extend: any, hooks: any) => {}
            const pluginDef = plugin({
                name: "my-plugin",
                setup: setupFn,
            })

            assert.deepEqual(pluginDef, {
                name: "my-plugin",
                setup: setupFn,
            })
        })
    })

    describe("plugin setup", () => {
        test("should call extend callback", async () => {
            let extendCalled = false
            const pluginDef = plugin({
                name: "test-plugin",
                setup: (extend, hooks) => {
                    extendCalled = true
                    extend((context) => {})
                },
            })

            // Simulate plugin loading
            const extend = (callback: any) => {}
            const hooks = { beforeRun: [], afterRun: [], onError: [] }
            await pluginDef.setup(extend, hooks)

            assert.strictEqual(extendCalled, true)
        })

        test("should support async setup", async () => {
            let setupComplete = false
            const pluginDef = plugin({
                name: "async-plugin",
                setup: async (extend, hooks) => {
                    await new Promise((resolve) => setTimeout(resolve, 1))
                    setupComplete = true
                    extend((context) => {})
                },
            })

            const extend = (callback: any) => {}
            const hooks = { beforeRun: [], afterRun: [], onError: [] }
            await pluginDef.setup(extend, hooks)

            assert.strictEqual(setupComplete, true)
        })

        test("should allow multiple extend calls", async () => {
            let extendCount = 0
            const pluginDef = plugin({
                name: "multi-extend-plugin",
                setup: (extend, hooks) => {
                    extend((context) => {
                        extendCount++
                    })
                    extend((context) => {
                        extendCount++
                    })
                    extend((context) => {
                        extendCount++
                    })
                },
            })

            const callbacks: Array<(context: PluginExtensionContext) => void> =
                []
            const extend = (
                callback: (context: PluginExtensionContext) => void
            ) => {
                callbacks.push(callback)
            }
            const hooks = { beforeRun: [], afterRun: [], onError: [] }

            await pluginDef.setup(extend, hooks)

            assert.strictEqual(callbacks.length, 3)

            // Execute all callbacks
            const context: PluginExtensionContext = {}
            callbacks.forEach((cb) => cb(context))

            assert.strictEqual(extendCount, 3)
        })

        test("should pass options to setup function", async () => {
            let receivedOptions: any = null
            const pluginDef = plugin({
                name: "options-plugin",
                setup: (extend, hooks, options) => {
                    receivedOptions = options
                },
            })

            const testOptions = { foo: "bar", baz: 123 }
            const extend = (callback: any) => {}
            const hooks = { beforeRun: [], afterRun: [], onError: [] }
            await pluginDef.setup(extend, hooks, testOptions)

            assert.deepEqual(receivedOptions, testOptions)
        })
    })

    describe("plugin context extension", () => {
        test("should extend global context", async () => {
            const pluginDef = plugin({
                name: "global-plugin",
                setup: (extend, hooks) => {
                    extend((context) => {
                        if (!context.global) context.global = {}
                        context.global.myFunction = () => "test"
                    })
                },
            })

            const callbacks: Array<(context: PluginExtensionContext) => void> =
                []
            const extend = (
                callback: (context: PluginExtensionContext) => void
            ) => {
                callbacks.push(callback)
            }

            await pluginDef.setup(extend, { beforeRun: [], afterRun: [], onError: [] })

            const context: PluginExtensionContext = {}
            callbacks[0](context)

            assert.strictEqual(typeof context.global?.myFunction, "function")
            assert.strictEqual(context.global?.myFunction(), "test")
        })

        test("should extend workspace context", async () => {
            const pluginDef = plugin({
                name: "workspace-plugin",
                setup: (extend, hooks) => {
                    extend((context) => {
                        if (!context.workspace) context.workspace = {}
                        context.workspace.customQuery = async () => []
                    })
                },
            })

            const callbacks: Array<(context: PluginExtensionContext) => void> =
                []
            const extend = (
                callback: (context: PluginExtensionContext) => void
            ) => {
                callbacks.push(callback)
            }

            await pluginDef.setup(extend, { beforeRun: [], afterRun: [], onError: [] })

            const context: PluginExtensionContext = {}
            callbacks[0](context)

            assert.strictEqual(
                typeof context.workspace?.customQuery,
                "function"
            )
        })

        test("should extend parsers context", async () => {
            const pluginDef = plugin({
                name: "parsers-plugin",
                setup: (extend, hooks) => {
                    extend((context) => {
                        if (!context.parsers) context.parsers = {}
                        context.parsers.readProto = async (file: string) => ({})
                    })
                },
            })

            const callbacks: Array<(context: PluginExtensionContext) => void> =
                []
            const extend = (
                callback: (context: PluginExtensionContext) => void
            ) => {
                callbacks.push(callback)
            }

            await pluginDef.setup(extend, { beforeRun: [], afterRun: [], onError: [] })

            const context: PluginExtensionContext = {}
            callbacks[0](context)

            assert.strictEqual(typeof context.parsers?.readProto, "function")
        })

        test("should extend host context", async () => {
            const pluginDef = plugin({
                name: "host-plugin",
                setup: (extend, hooks) => {
                    extend((context) => {
                        if (!context.host) context.host = {}
                        context.host.customService = () => "service"
                    })
                },
            })

            const callbacks: Array<(context: PluginExtensionContext) => void> =
                []
            const extend = (
                callback: (context: PluginExtensionContext) => void
            ) => {
                callbacks.push(callback)
            }

            await pluginDef.setup(extend, { beforeRun: [], afterRun: [], onError: [] })

            const context: PluginExtensionContext = {}
            callbacks[0](context)

            assert.strictEqual(typeof context.host?.customService, "function")
            assert.strictEqual(context.host?.customService(), "service")
        })

        test("should allow multiple context extensions", async () => {
            const pluginDef = plugin({
                name: "multi-context-plugin",
                setup: (extend, hooks) => {
                    extend((context) => {
                        if (!context.global) context.global = {}
                        if (!context.workspace) context.workspace = {}
                        if (!context.parsers) context.parsers = {}
                        if (!context.host) context.host = {}

                        context.global.func1 = () => {}
                        context.workspace.func2 = () => {}
                        context.parsers.func3 = () => {}
                        context.host.func4 = () => {}
                    })
                },
            })

            const callbacks: Array<(context: PluginExtensionContext) => void> =
                []
            const extend = (
                callback: (context: PluginExtensionContext) => void
            ) => {
                callbacks.push(callback)
            }

            await pluginDef.setup(extend, { beforeRun: [], afterRun: [], onError: [] })

            const context: PluginExtensionContext = {}
            callbacks[0](context)

            assert.strictEqual(typeof context.global?.func1, "function")
            assert.strictEqual(typeof context.workspace?.func2, "function")
            assert.strictEqual(typeof context.parsers?.func3, "function")
            assert.strictEqual(typeof context.host?.func4, "function")
        })
    })
})
